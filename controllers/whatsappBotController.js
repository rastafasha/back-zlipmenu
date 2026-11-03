const Tienda = require('../models/tienda'); 
const Producto = require('../models/producto'); 
const translate = require('google-translate-api-x');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;


/**
 * Función auxiliar para detectar si un mensaje entrante es una comanda generada por el frontend
 */
const esUnPedidoFormateado = (texto) => {
    const Lower = texto.toLowerCase();
    // Identifica patrones comunes de las plantillas de texto de tu carrito
    return (lower.includes('pedido') || lower.includes('orden')) && 
           (lower.includes('total') || lower.includes('subtotal')) &&
           (lower.includes('x1') || lower.includes('x2') || lower.includes('cantidad'));
};


/**
 * Maneja los mensajes entrantes de los clientes finales para un local específico
 * @param {string} idLocal - ID de la tienda dueña de la sesión
 * @param {Object} message - Objeto message provisto por whatsapp-web.js
 * @param {Object} client - Instancia activa de whatsapp-web.js para este local
 */


/**
 * Procesa en tiempo real los mensajes entrantes de los clientes finales
 */
const procesarMensajeBot = async (idLocal, message, client) => {
    if (message.isGroup || message.from === 'status@broadcast') return;

    const textoOriginal = message.body; 
    const textoUsuario = textoOriginal.toLowerCase().trim();
    const remitente = message.from; 

    try {
        // 1. Traer la tienda de la base de datos
        const tienda = await Tienda.findById(idLocal);
        if (!tienda || !tienda.botActivo) return; 

        // 🚀 CONSTRUCCIÓN 100% DINÁMICA DEL SUBDOMINIO DESDE EL SLUG
        // Usamos directamente tu propiedad nativa tienda.slug para inyectarla en la URL
        const urlTienda = `https://${tienda.slug.trim().toLowerCase()}.zlipmenu.com`;

        // =========================================================================
        // 🚨 INTERCEPTOR: DETECCIÓN DE COMANDAS DESDE TU FRONTEND EN ANGULAR
        // =========================================================================
        if (esUnPedidoFormateado(textoOriginal)) {
            console.log(`🛒 [Bot] Comanda detectada dinámicamente en: ${urlTienda}`);

            const mensajeConfirmacion = 
                `🎉 *¡Pedido Recibido Exitosamente!* 🎉\n\n` +
                `Gracias por elegir *${tienda.nombre || 'nuestro local'}*. Hemos procesado tu orden enviada desde nuestra plataforma web.\n\n` +
                `⏳ *Estado:* En preparación\n` +
                `👤 *Cliente:* Hemos asociado tu orden a este número de WhatsApp.\n\n` +
                `🔔 Te notificaremos por aquí en cuanto tu pedido salga de la cocina o esté listo. ¡Muchas gracias! ✨`;

            await client.sendMessage(remitente, mensajeConfirmacion);
            return; 
        }

        // =========================================================================
        // DISPARADORES DE MENÚ PRINCIPAL TRADICIONAL
        // =========================================================================
        const palabrasClaveMenu = ['hola', 'buenas', 'menu', 'carta', 'pedir', 'precios', 'comenzar', 'start'];
        
        if (palabrasClaveMenu.some(palabra => textoUsuario.includes(palabra))) {
            const destacados = await Producto.find({ local: idLocal, disponibilidad: true })
                .limit(3)
                .select('titulo precio');

            let listaDestacados = '';
            destacados.forEach(p => {
                listaDestacados += `\n• *${p.titulo.es}* - $${p.precio}`;
            });

            const mensajeBienvenida = 
                `👋 ¡Hola! Bienvenido a *${tienda.nombre || 'nuestro comercio'}* 🌟\n\n` +
                `Te invito a ver nuestro catálogo digital interactivo en nuestro sitio web oficial:\n` +
                `🔗 *${urlTienda}*\n\n` +
                `📋 *Algunas sugerencias de hoy:*${listaDestacados}\n\n` +
                `👉 Si buscas algo en específico, solo escribe su nombre (ej: _Hamburguesa_, _Alimento_, etc.).`;

            await client.sendMessage(remitente, mensajeBienvenida);
            return;
        }

        // =========================================================================
        // MOTOR DE BÚSQUEDA INTEGRADO (Redirección exacta al subdominio del local)
        // =========================================================================
        if (textoUsuario.length > 2) {
            const busquedaRegEx = new RegExp(textoUsuario, 'i');
            
            const productosEncontrados = await Producto.find({
                local: idLocal,
                disponibilidad: true,
                'titulo.es': busquedaRegEx
            }).limit(3);

            if (productosEncontrados.length > 0) {
                await client.sendMessage(remitente, `🔍 He encontrado estas opciones para ti:`);

                for (const prod of productosEncontrados) {
                    if (prod.whatsappProductId) {
                        try {
                            await client.sendMessage(remitente, {
                                type: 'product',
                                productId: prod.whatsappProductId,
                                businessOwnerJid: client.info.wid._serialized
                            });
                            continue; 
                        } catch (errProduct) {
                            console.error(`⚠️ Error al enviar tarjeta nativa de WA:`, errProduct.message);
                        }
                    }

                    // Genera el enlace apuntando al subdominio correspondiente (ej: https://zlipmenu.com)
                    const urlProducto = `${urlTienda}/${prod.slug}`;

                    const detalleTexto = 
                        `📦 *${prod.titulo.es}*\n` +
                        `💵 Precio: $${prod.precio}\n` +
                        `📝 ${prod.info_short.es || 'Sin descripción disponible.'}\n\n` +
                        `🛒 Ordénalo aquí: ${urlProducto}`;

                    if (prod.img) {
                        try {
                            const { MessageMedia } = require('whatsapp-web.js');
                            const media = await MessageMedia.fromUrl(prod.img);
                            await client.sendMessage(remitente, media, { caption: detalleTexto });
                        } catch (imgErr) {
                            await client.sendMessage(remitente, detalleTexto);
                        }
                    } else {
                        await client.sendMessage(remitente, detalleTexto);
                    }
                }
                return;
            }
        }

        // =========================================================================
        // FALLBACK GENERAL
        // =========================================================================
        const mensajeDefault = 
            `🤖 No logré comprender tu mensaje, pero no te preocupes.\n\n` +
            `Puedes acceder directamente a toda nuestra variedad, imágenes y precios desde nuestro sitio oficial:\n` +
            `🔗 ${urlTienda}\n\n` +
            `¡Es la forma más rápida de comprar! Si quieres reiniciar este chat escribe *Menú*.`;

        await client.sendMessage(remitente, mensajeDefault);

    } catch (error) {
        console.error(`❌ Error en el flujo del Bot de WhatsApp para el local ${idLocal}:`, error);
    }
};

module.exports = {
    procesarMensajeBot
};