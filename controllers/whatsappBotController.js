const Tienda = require('../models/tienda'); 
const Producto = require('../models/producto'); 
const translate = require('google-translate-api-x');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;

/**
 * Maneja los mensajes entrantes de los clientes finales para un local específico
 * @param {string} idLocal - ID de la tienda dueña de la sesión
 * @param {Object} message - Objeto message provisto por whatsapp-web.js
 * @param {Object} client - Instancia activa de whatsapp-web.js para este local
 */
export const procesarMensajeBot = async (idLocal, message, client) => {
    // Evitar procesar mensajes de grupos o estados para ahorrar recursos
    if (message.isGroup || message.from === 'status@broadcast') return;

    const textoUsuario = message.body.toLowerCase().trim();
    const remitente = message.from; // JID del cliente (ej: 54911xxxxxxx@c.us)

    try {
        // 1. Validar si la tienda tiene el bot activo (Flujo Multi-Tenant)
        const tienda = await Tienda.findById(idLocal);
        if (!tienda || !tienda.botActivo) return; 

        // 2. MENU PRINCIPAL: Disparadores comunes (hola, buenas, menu, carta, etc.)
        const palabrasClaveMenu = ['hola', 'buenas', 'menu', 'carta', 'pedir', 'precios', 'comenzar'];
        
        if (palabrasClaveMenu.some(palabra => textoUsuario.includes(palabra))) {
            
            // Buscamos una pequeña muestra de productos destacados en la BD para sugerir
            const productosDestacados = await Producto.find({ local: idLocal, disponibilidad: true })
                .limit(3)
                .select('titulo precio');

            let listaProductos = '';
            productosDestacados.forEach(p => {
                listaProductos += `\n• *${p.titulo.es}* - $${p.precio}`;
            });

            const urlMenuDigital = `https://zlipmenu.com{tienda.slug}`;

            const mensajeBienvenida = 
                `👋 ¡Hola! Bienvenido a *${tienda.nombre || 'nuestro restaurante'}* 🌟\n\n` +
                `Te presento nuestro menú digital interactivo donde puedes armar tu pedido con variantes y modificadores:\n` +
                `🔗 *${urlMenuDigital}*\n\n` +
                `📋 *Algunos de nuestros platos de hoy:*${listaProductos}\n\n` +
                `👉 Si buscas algo en específico, solo escribe el nombre del plato (ej: _Hamburguesa_).`;

            await client.sendMessage(remitente, mensajeBienvenida);
            return;
        }

        // 3. MOTOR DE BÚSQUEDA INTELIGENTE DE PLATOS
        // Si el usuario escribe palabras sueltas, buscamos coincidencias parciales (regex) en Mongoose
        if (textoUsuario.length > 2) {
            const busquedaRegEx = new RegExp(textoUsuario, 'i');
            
            const productosEncontrados = await Producto.find({
                local: idLocal,
                disponibilidad: true,
                'titulo.es': busquedaRegEx
            }).limit(3);

            if (productosEncontrados.length > 0) {
                await client.sendMessage(remitente, `🔍 Encontré estas opciones para ti en nuestro menú:`);

                for (const prod of productosEncontrados) {
                    // Si el producto fue sincronizado desde el catálogo de WhatsApp, enviamos la tarjeta nativa
                    if (prod.whatsappProductId) {
                        try {
                            // Estructura oficial de whatsapp-web.js para reenviar productos nativos del catálogo del negocio
                            await client.sendMessage(remitente, {
                                type: 'product',
                                productId: prod.whatsappProductId,
                                businessOwnerJid: client.info.wid._serialized
                            });
                            continue; // Pasa al siguiente producto
                        } catch (errProduct) {
                            console.error(`⚠️ Error al enviar tarjeta nativa de WA para producto ${prod._id}:`, errProduct.message);
                        }
                    }

                    // Si no tiene tarjeta nativa o falla, enviamos un bloque de texto formateado con su imagen de Cloudinary
                    const detalleProducto = 
                        `🍔 *${prod.titulo.es}*\n` +
                        `💵 Precio: $${prod.precio}\n` +
                        `📝 ${prod.info_short.es || 'Sin descripción disponible.'}\n\n` +
                        `Pídelo completo aquí: https://zlipmenu.com{tienda.slug}/${prod.slug}`;

                    if (prod.img) {
                        // Enviar con foto si existe en Cloudinary
                        const { default: MessageMedia } = await import('whatsapp-web.js');
                        try {
                            const media = await MessageMedia.fromUrl(prod.img);
                            await client.sendMessage(remitente, media, { caption: detalleProducto });
                        } catch (imgErr) {
                            await client.sendMessage(remitente, detalleProducto);
                        }
                    } else {
                        await client.sendMessage(remitente, detalleProducto);
                    }
                }
                return;
            }
        }

        // 4. RESPUESTA POR DEFECTO (Fallback si el bot no entiende la frase)
        const mensajeFallback = 
            `🤖 No logré entender tu mensaje, pero no te preocupes.\n\n` +
            `Puedes ver toda nuestra variedad, precios y realizar tu orden directamente desde nuestro menú digital en el siguiente enlace:\n` +
            `🔗 https://zlipmenu.com{tienda.slug}\n\n` +
            `¡Es más rápido y seguro! Escibe *Menú* si deseas reiniciar el asistente.`;

        await client.sendMessage(remitente, mensajeFallback);

    } catch (error) {
        console.error(`❌ Error en el flujo del Bot de WhatsApp para el local ${idLocal}:`, error);
    }
};