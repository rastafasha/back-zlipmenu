const Tienda = require('../models/tienda'); 
const Producto = require('../models/producto'); 
const translate = require('google-translate-api-x');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;

// Sincronizamos las credenciales exactas que usa tu controlador de subidas
cloudinary.config({
    api_key: process.env.API_KEY_CLOUDINARY,
    api_secret: process.env.API_SECRET_CLOUDINARY,
    cloud_name: process.env.CLOUD_NAME
});

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


/**
 * Sube la imagen efímera de WhatsApp directamente a Cloudinary sin tocar el disco de Render
 */
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
        console.error(`⚠️ Error con imagen del producto WA ${whatsappProductId}:`, error.message);
        return '';
    }
};



/**
 * Controlador de Express para Sincronizar el catálogo desde Puppeteer
 */
const sincronizarCatalogoWhatsApp = async (req, res) => {
    const idLocal = req.body.local; 
    const uid = req.uid; 
    
    // Objeto global indexado por el ID del restaurante que contiene la instancia de whatsapp-web.js
    const client = clientesActivos[idLocal]; 

    if (!client) {
        return res.status(400).json({
            ok: false,
            msg: 'No hay una sesión de WhatsApp activa o conectada para este restaurante.'
        });
    }

    try {
        console.log(`⏱️ Extrayendo catálogo de WhatsApp Business para el local: ${idLocal}`);

        // Extracción directa de objetos planos (POJOs) desde el navegador
        const productosWA = await client.pupPage.evaluate(async () => {
            if (!window.Store || !window.Store.Catalog) {
                throw new Error("El módulo de catálogo de WhatsApp Web no está listo.");
            }
            
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
            return res.json({ ok: true, msg: 'El catálogo de WhatsApp está vacío.', creados: 0, actualizados: 0 });
        }

        let creados = 0;
        let actualizados = 0;

        // Bucle secuencial asíncrono para no saturar las llamadas en paralelo a la IA de traducción
        for (const prod of productosWA) {
            if (!prod.titulo) continue;

            const slug = generarSlugNativo(prod.titulo);

            // Verificación multi-tenant idéntica a tu lógica de unicidad
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
                actualizados++;
                continue;
            }

            // 🚀 LA MAGIA BILINGÜE (JS Puro): Traduciendo en paralelo igual que en crearProducto
            const [traducirTitulo, traducirInfoShort] = await Promise.all([
                translate(prod.titulo, { from: 'es', to: 'en' }),
                translate(prod.info_short, { from: 'es', to: 'en' })
            ]);

            const imgCloudinary = await procesarImagenWhatsApp(idLocal, prod.whatsappProductId, prod.imageUrl);

            // Estructura de guardado idéntica a tus sub-objetos bilingües { es, en }
            const nuevoProducto = new Producto({
                ...req.body, // Hereda categorías, stock y configuraciones extra enviadas desde el front
                local: idLocal,
                usuario: uid,
                slug: slug,
                whatsappProductId: prod.whatsappProductId,
                precio: prod.precio,
                disponibilidad: prod.disponibilidad,
                img: imgCloudinary,
                titulo: {
                    es: prod.titulo,
                    en: traducirTitulo.text
                },
                info_short: {
                    es: prod.info_short,
                    en: traducirInfoShort.text
                },
                detalle: {
                    es: prod.info_short,
                    en: traducirInfoShort.text
                }
            });

            await nuevoProducto.save();
            creados++;
        }

        // Actualizamos los metadatos directamente en la colección de Tiendas
        await Tienda.findByIdAndUpdate(idLocal, {
            'whatsappCatalog.lastSyncAt': new Date(),
            'whatsappCatalog.totalProducts': productosWA.length
        });

        res.json({
            ok: true,
            msg: 'Catálogo sincronizado exitosamente.',
            stats: {
                totalWhatsApp: productosWA.length,
                creados: creados,
                actualizados: actualizados
            }
        });

    } catch (error) {
        console.error('❌ Error en sincronizarCatalogoWhatsApp:', error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin',
            error: error.message
        });
    }
};

module.exports = { 
    sincronizarCatalogoWhatsApp
};

