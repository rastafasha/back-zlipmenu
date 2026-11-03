/*
 Ruta: /api/whatsapp
 */

 const { Router } = require('express');
 const router = Router();
 const {
 sincronizarCatalogoWhatsApp
 } = require('../controllers/whatsappController');
 const { validarJWT } = require('../middlewares/validar-jwt');
 const { validarCampos } = require('../middlewares/validar-campos');
 
 
 router.post('/sincronizar-catalogo', [
     validarJWT,
     validarCampos
 ], sincronizarCatalogoWhatsApp);

 /**
 * PUT: /api/whatsapp/toggle-bot
 * @body {string} local - ID de la tienda a modificar
 * @body {boolean} botActivo - Nuevo estado del bot (true/false)
 */
router.put('/toggle-bot', [validarJWT], async (req, res) => {
    const idLocal = req.body.local;
    const nuevoEstado = req.body.botActivo;
    const uid = req.uid; // Extraído de forma segura por el middleware validarJWT

    // 1. Validaciones de entrada básicas
    if (idLocal === undefined || nuevoEstado === undefined) {
        return res.status(400).json({
            ok: false,
            msg: 'Faltan parámetros requeridos: local y botActivo.'
        });
    }

    try {
        // 2. Buscar la tienda y validar que pertenezca al usuario (Aislamiento de Seguridad)
        const tienda = await Tienda.findById(idLocal);

        if (!tienda) {
            return res.status(444).json({
                ok: false,
                msg: 'La tienda solicitada no existe.'
            });
        }

        // Si tu modelo tiene una relación con el usuario dueño del local (ej: tienda.usuario)
        if (tienda.usuario && tienda.usuario.toString() !== uid) {
            return res.status(403).json({
                ok: false,
                msg: 'No tienes permisos para modificar la configuración de este comercio.'
            });
        }

        // 3. Persistir el cambio del Flag en MongoDB
        tienda.botActivo = nuevoEstado;
        await tienda.save();

        console.log(`🤖 [Bot Config] Local ${tienda.nombre} (${idLocal}) cambió botActivo a: ${nuevoEstado}`);

        return res.json({
            ok: true,
            msg: `El asistente virtual de WhatsApp ha sido ${nuevoEstado ? 'activado' : 'desactivado'} correctamente.`,
            botActivo: tienda.botActivo
        });

    } catch (error) {
        console.error('❌ Error en el endpoint toggle-bot:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Hable con el admin',
            error: error.message
        });
    }
});

/**
 * POST: /api/whatsapp/notificar-estado-pedido
 * @body {string} local - ID de la tienda en MongoDB
 * @body {string} clienteTelefono - Número de WhatsApp del cliente final (ej: "54911xxxxxxx")
 * @body {string} estado - Nuevo estado del pedido ('LISTO' o 'DESPACHADO')
 * @body {string} nroPedido - Número de orden o ticket de control
 */
router.post('/notificar-estado-pedido', [validarJWT], async (req, res) => {
    const { local: idLocal, clienteTelefono, estado, nroPedido } = req.body;
    const uid = req.uid;

    if (!idLocal || !clienteTelefono || !estado || !nroPedido) {
        return res.status(400).json({
            ok: false,
            msg: 'Faltan parámetros críticos para el envío de la notificación.'
        });
    }

    try {
        // 1. Aislamiento Multi-Tenant: Validar propiedad de la tienda
        const tienda = await Tienda.findById(idLocal);
        if (!tienda) {
            return res.status(404).json({ ok: false, msg: 'La tienda no existe.' });
        }

        if (tienda.usuario && tienda.usuario.toString() !== uid) {
            return res.status(403).json({ ok: false, msg: 'No autorizado para este comercio.' });
        }

        // 2. Rescatar la instancia viva de Puppeteer de las sesiones activas globales
        const client = global.clientesActivos[idLocal];
        if (!client) {
            return res.status(400).json({
                ok: false,
                msg: 'El canal de WhatsApp de este local no está conectado o disponible en memoria.'
            });
        }

        // 3. Normalizar el número telefónico del cliente final al formato JID oficial de WhatsApp
        // Nos aseguramos de limpiar arrobas, espacios y añadir el sufijo '@c.us'
        let destinoJid = clienteTelefono.trim().replace('@c.us', '');
        destinoJid = `${destinoJid}@c.us`;

        // 4. Personalizar la plantilla del mensaje de acuerdo al estado seleccionado
        let mensajeNotificacion = '';

        if (estado === 'LISTO') {
            mensajeNotificacion = 
                `🍕🛍️ *¡Tu pedido está Listo para Retirar!* 🛍️🍕\n\n` +
                `Hola, te avisamos de *${tienda.nombre}* que tu orden *#${nroPedido}* ya salió de la cocina y te está esperando en el mostrador.\n\n` +
                `📍 Puedes pasar a buscarlo cuando gustes.\n` +
                `🙏 ¡Muchas gracias por tu compra!`;
        } else if (estado === 'DESPACHADO') {
            mensajeNotificacion = 
                `🛵💨 *¡Tu pedido va en Camino!* 💨🛵\n\n` +
                `¡Buenas noticias! Tu orden *#${nroPedido}* de *${tienda.nombre}* ya fue entregada al repartidor.\n\n` +
                `🏠 Prepara la mesa, tu comida llegará a tu domicilio en unos minutos.\n` +
                `📱 Mantén tu teléfono cerca por cualquier duda del delivery.`;
        } else {
            return res.status(400).json({ ok: false, msg: 'Estado de pedido no soportado por la plantilla.' });
        }

        // 5. Enviar de forma programática a través de whatsapp-web.js
        await client.sendMessage(destinoJid, mensajeNotificacion);

        console.log(`🔔 [Notificación Pedido] Mensaje enviado con éxito a ${destinoJid} para la orden #${nroPedido}`);

        return res.json({
            ok: true,
            msg: `Notificación de pedido #${nroPedido} enviada al cliente.`
        });

    } catch (error) {
        console.error('❌ Error enviando notificación por WhatsApp:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Hable con el admin',
            error: error.message
        });
    }
});
 
 module.exports = router;