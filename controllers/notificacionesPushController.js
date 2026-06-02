'use strict'
const PushSubscription = require('../models/push-subscription');
const Usuario = require('../models/usuario');
const { sendNotification } = require('../helpers/notificaciones');
// Si necesitas guardar el historial en la base de datos de notificaciones (tu primer esquema), impórtalo:
const Notificacion = require('../models/notificacion'); 

// 1. Guardar Suscripción
const guardarSuscripcion = async (req, res) => {
    try {
        const subscription = req.body;
        const uid = req.uid;

        await PushSubscription.findOneAndUpdate(
            { 'subscription.endpoint': subscription.endpoint }, 
            { usuario: uid, subscription: subscription },
            { upsert: true, new: true }
        );

        await Usuario.findByIdAndUpdate(uid, { pushSubscription: subscription });
        
        await sendNotification(
            subscription, 
            '¡Bienvenido!', 
            'Ahora recibirás los avisos aquí.',
            '/home'
        );
        
        res.status(201).json({ ok: true, msg: 'Suscripción guardada' });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al guardar suscripción' });
    }
};

// 2. Envío Individual (Modificado para soportar Sockets e Historial)
const enviarPushIndividual = async (req, res) => {
    try {
        const { destinatarioId, mensaje, remitenteNombre, tipo = 'NUEVO_MENSAJE', referenciaId = null } = req.body;
        const titulo = '¡Nuevo Mensaje!';
        const cuerpo = `De ${remitenteNombre}: ${mensaje}`;

        // OPTATIVO: Guardar la alerta en el historial in-app (Tu esquema de notificaciones)
        const nuevaNotif = new Notificacion({
            usuario: destinatarioId,
            titulo,
            mensaje: cuerpo,
            tipo,
            referenciaId
        });
        await nuevaNotif.save();

        // 🟢 SOLUCIÓN IPHONE 6S: Emitir por Sockets en tiempo real si el usuario está conectado
        if (global.io) {
            global.io.to(destinatarioId.toString()).emit('notificacion-recibida', nuevaNotif);
        }

        // 🌐 SEGUNDO PLANO: Buscar dispositivos registrados para Web Push tradicional
        const subs = await PushSubscription.find({ usuario: destinatarioId });
        subs.forEach(s => {
            sendNotification(s.subscription, titulo, cuerpo)
                .catch(err => {
                    if (err.statusCode === 410) s.deleteOne(); // Limpieza automática si expiró
                });
        });

        res.json({ ok: true, msg: 'Procesando envío híbrido...' });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al enviar' });
    }
};

// 3. Envío Masivo (Modificado para alertar a todos los conectados por Sockets)
const enviarPushATodos = async (req, res) => {
    const { titulo, mensaje } = req.body;
    try {
        // 🟢 SOLUCIÓN IPHONE 6S: Emitir a TODOS los usuarios conectados a la app en este instante
        if (global.io) {
            // Creamos un objeto genérico de notificación para la UI de Angular
            const notifMasiva = { titulo, mensaje, tipo: 'AVISO_GENERAL', createdAt: new Date() };
            global.io.emit('notificacion-recibida', notifMasiva);
        }

        // 🌐 SEGUNDO PLANO: Envío masivo Web Push a los navegadores registrados
        const suscripciones = await PushSubscription.find();
        if (suscripciones.length === 0) return res.json({ ok: true, msg: 'No hay dispositivos para Push' });

        const promesas = suscripciones.map(s => 
            sendNotification(s.subscription, titulo, mensaje)
                .catch(err => { if (err.statusCode === 410) s.deleteOne(); })
        );

        await Promise.all(promesas);
        res.json({ ok: true, msg: `Enviado a ${suscripciones.length} dispositivos.` });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error en masivo' });
    }
};

module.exports = {
    guardarSuscripcion,
    enviarPushIndividual,
    enviarPushATodos
};
