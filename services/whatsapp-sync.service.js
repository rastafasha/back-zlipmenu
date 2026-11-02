const Tienda = require('../models/tienda'); 
const Producto = require('../models/producto'); 
const translate = require('google-translate-api-x');
const cloudinary = require('cloudinary').v2;


const cron = require('node-cron');
const mongoose = require('mongoose');

// Reutilizamos tu generador de slugs nativo
const generarSlugNativo = (titulo) => {
    return titulo
        .toLowerCase()
        .trim()
        .replace(/ñ/g, 'n')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s]+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
};

// Sube la imagen efímera de WhatsApp a Cloudinary
const procesarImagenWhatsApp = async (idLocal, whatsappProductId, urlTemporal) => {
    if (!urlTemporal) return '';
    try {
        const publicId = `local_${idLocal}_wa_${whatsappProductId}`;
        const uploadRes = await cloudinary.v2.uploader.upload(urlTemporal, {
            public_id: publicId,
            overwrite: true,
            invalidate: true,
            folder: 'zlipmenu_productos'
        });
        return uploadRes.secure_url;
    } catch (error) {
        console.error(`⚠️ [Cron] Error con imagen del producto WA ${whatsappProductId}:`, error.message);
        return '';
    }
};

/**
 * Inicializa la tarea programada del sistema
 * @param {Object} clientesActivos - Objeto global indexado que contiene las instancias activas de whatsapp-web.js
 */
const inicializarCronWhatsApp = (clientesActivos) => {
    
    // Configurado para ejecutarse TODOS los días a las 03:00 AM (0 3 * * *)
    cron.schedule('0 3 * * *', async () => {
        console.log('⏰ [Cron] Iniciando proceso automatizado de sincronización de catálogos...');

        try {
            // 1. Buscar únicamente las tiendas que tienen el estado conectado
            const tiendasConectadas = await Tienda.find({ whatsappStatus: 'CONECTADO' });
            
            console.log(`⏰ [Cron] Se encontraron ${tiendasConectadas.length} tiendas con WhatsApp activo.`);

            // 2. Procesar SECUENCIALMENTE local por local para cuidar la RAM de Render
            for (const tienda of tiendasConectadas) {
                const idLocal = tienda._id.toString();
                const client = clientesActivos[idLocal];

                // Si la tienda dice CONECTADO en BD pero el cliente se cayó en memoria, lo saltamos
                if (!client || !client.pupPage) {
                    console.log(`⚠️ [Cron] Local ${idLocal} marcado conectado pero sin instancia activa en memoria. Saltando...`);
                    continue;
                }

                console.log(`⏱️ [Cron] Procesando catálogo automático para local: ${tienda.nombre || idLocal}`);

                try {
                    // 3. Extraer productos desde Puppeteer de esta tienda
                    const productosWA = await client.pupPage.evaluate(async () => {
                        if (!window.Store || !window.Store.Catalog) return [];
                        const catalogCollection = window.Store.Catalog;
                        await catalogCollection.updateCollection();
                        const models = catalogCollection.toArray();

                        return models.map(p => {
                            var _p$id, _p$imageCollection, _p$imageCollection$ge;
                            return {
                                whatsappProductId: ((_p$id = p.id) === null || _p$id === void 0 ? void 0 : _p$id.toString()) || p.id,
                                titulo: p.name || '',
                                info_short: p.description || '',
                                precio: p.priceAmount1000 ? (p.priceAmount1000 / 1000) : 0,
                                imageUrl: p.getResizedUrl() || ((_p$imageCollection = p.imageCollection) === null || _p$imageCollection === void 0 ? void 0 : (_p$imageCollection$ge = _p$imageCollection.getHead()) === null || _p$imageCollection$ge === void 0 ? void 0 : _p$imageCollection$ge.url) || '',
                                disponibilidad: p.isAvailable !== false
                            };
                        });
                    });

                    if (productosWA.length === 0) {
                        console.log(`[Cron] Catálogo vacío en WhatsApp para el local: ${idLocal}`);
                        continue;
                    }

                    // 4. Mapear y procesar productos del local
                    for (const prod of productosWA) {
                        if (!prod.titulo) continue;

                        const slug = generarSlugNativo(prod.titulo);

                        const productoExistente = await Producto.findOne({
                            local: idLocal,
                            $or: [{ slug: slug }, { whatsappProductId: prod.whatsappProductId }]
                        });

                        if (productoExistente) {
                            productoExistente.whatsappProductId = prod.whatsappProductId;
                            productoExistente.precio = prod.precio;
                            productoExistente.disponibilidad = prod.disponibilidad;
                            
                            if (!productoExistente.img && prod.imageUrl) {
                                productoExistente.img = await procesarImagenWhatsApp(idLocal, prod.whatsappProductId, prod.imageUrl);
                            }

                            await productoExistente.save();
                            continue;
                        }

                        // Traducción automática en paralelo vía IA para nuevos productos detectados en la madrugada
                        const [traducirTitulo, traducirInfoShort] = await Promise.all([
                            translate(prod.titulo, { from: 'es', to: 'en' }),
                            translate(prod.info_short, { from: 'es', to: 'en' })
                        ]);

                        const imgCloudinary = await procesarImagenWhatsApp(idLocal, prod.whatsappProductId, prod.imageUrl);

                        const nuevoProducto = new Producto({
                            local: idLocal,
                            usuario: tienda.usuario, // Vinculado al dueño original de la tienda
                            slug: slug,
                            whatsappProductId: prod.whatsappProductId,
                            precio: prod.precio,
                            disponibilidad: prod.disponibilidad,
                            img: imgCloudinary,
                            titulo: { es: prod.titulo, en: traducirTitulo.text },
                            info_short: { es: prod.info_short, en: traducirInfoShort.text },
                            detalle: { es: prod.info_short, en: traducirInfoShort.text }
                        });

                        await nuevoProducto.save();
                    }

                    // Actualizar bitácora en la Tienda
                    await Tienda.findByIdAndUpdate(idLocal, {
                        'whatsappCatalog.lastSyncAt': new Date(),
                        'whatsappCatalog.totalProducts': productosWA.length
                    });

                    console.log(`✅ [Cron] Sincronización exitosa para el local: ${idLocal}`);

                } catch (errLocal) {
                    console.error(`❌ [Cron] Error procesando el local ${idLocal}:`, errLocal.message);
                }
            }

            console.log('🏁 [Cron] Tarea de sincronización nocturna de WhatsApp finalizada completamente.');

        } catch (error) {
            console.error('❌ [Cron] Error crítico en el planificador general:', error);
        }
    });
};

// Despierta el Cron Job inyectándole el puntero de las sesiones vivas
inicializarCronWhatsApp(global.clientesActivos);
console.log('🛡️  Zlipmenu System: Cron Jobs operativos de forma segura.');


module.exports = { inicializarCronWhatsApp };
