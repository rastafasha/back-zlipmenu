'use strict'
const PushSubscription = require('../models/push-subscription');
const Usuario = require('../models/usuario');
const { sendNotification } = require('../helpers/notificaciones');
const Notificacion = require('../models/notificacion'); 

// 1. Guardar o Sincronizar Suscripción
const guardarSuscripcion = async (req, res) => {
    try {
        // Puedes enviar { subscription, silencioso: true } o el objeto subscription directo
        const subscription = req.body.subscription || req.body;
        const silencioso = req.body.silencioso || false;
        const uid = req.uid;

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ ok: false, msg: 'Suscripción inválida' });
        }

        // 1. Si otro usuario tenía este mismo navegador/endpoint, se lo quitamos de su perfil
        await Usuario.updateMany(
            { 'pushSubscription.endpoint': subscription.endpoint, _id: { $ne: uid } },
            { $unset: { pushSubscription: "" } }
        );

        // 2. Actualizamos o creamos el registro vinculándolo al usuario actual (uid)
        const registroExistente = await PushSubscription.findOne({ 'subscription.endpoint': subscription.endpoint });
        const esNuevoParaEsteUsuario = !registroExistente || registroExistente.usuario.toString() !== uid.toString();

        await PushSubscription.findOneAndUpdate(
            { 'subscription.endpoint': subscription.endpoint }, 
            { usuario: uid, subscription: subscription },
            { upsert: true, new: true }
        );

        await Usuario.findByIdAndUpdate(uid, { pushSubscription: subscription });
        
        // 3. Solo enviamos bienvenida si NO es silencioso y es nuevo para este usuario
        if (!silencioso && esNuevoParaEsteUsuario) {
            await sendNotification(
                subscription, 
                '¡Bienvenido!', 
                'Ahora recibirás los avisos aquí.',
                '/home'
            );
        }
        
        res.status(201).json({ ok: true, msg: 'Suscripción guardada y vinculada' });
    } catch (error) {
        console.error('Error en guardarSuscripcion:', error);
        res.status(500).json({ ok: false, msg: 'Error al guardar suscripción' });
    }
};

// 1.5 Eliminar Suscripción (Para llamar en el Logout de Angular)
const eliminarSuscripcion = async (req, res) => {
    try {
        const { endpoint } = req.body;
        const uid = req.uid;

        if (endpoint) {
            await PushSubscription.deleteOne({ 'subscription.endpoint': endpoint });
        }
        if (uid) {
            await Usuario.findByIdAndUpdate(uid, { $unset: { pushSubscription: "" } });
        }

        res.json({ ok: true, msg: 'Dispositivo desvinculado correctamente' });
    } catch (error) {
        console.error('Error al eliminar suscripción:', error);
        res.status(500).json({ ok: false, msg: 'Error al desvincular dispositivo' });
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
    enviarPushATodos,
    eliminarSuscripcion
};
