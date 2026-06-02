const webpush = require('web-push');
const Notificacion = require('../models/notificacion'); // Historial In-App

const vapidKeys = {
    "publicKey": process.env.VAPI_KEY_PUBLIC || '',
    "privateKey": process.env.VAPI_KEY_PRIVATE || ''
};

webpush.setVapidDetails(
    'mailto:mercadocreativo@gmail.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey,
);

/**
 * Helper Centralizado para Notificaciones Híbridas
 * @param {Object} userSubscription - Datos de suscripción push del usuario
 * @param {string} title - Título de la notificación
 * @param {string} message - Cuerpo de la notificación
 * @param {string} url - Ruta de redirección en Angular (ej: '/mis-pagos')
 * @param {string} usuarioId - ID del destinatario
 * @param {string} tipo - ENUM de tu modelo (ej: 'NUEVO_PAGO', 'PAGO_APROBADO')
 * @param {string} [referenciaId] - ID de la operación (Opcional)
 */
const sendNotification = async (userSubscription, title, message, url = '/notificaciones', usuarioId = null, tipo = 'AVISO_GENERAL', referenciaId = null) => {
  
  let nuevaNotif = null;

  // 1. HISTORIAL: Si nos pasan el usuarioId, guardamos la notificación en Mongo de forma automática
  if (usuarioId) {
  try {
    // Buscamos si ya se registró esta misma notificación hace menos de 5 segundos
    const yaExiste = await Notificacion.findOne({
      usuario: usuarioId,
      referenciaId,
      tipo,
      createdAt: { $gte: new Date(Date.now() - 5000) } 
    });

    if (!yaExiste) {
      nuevaNotif = new Notificacion({
        usuario: usuarioId,
        titulo: title,
        mensaje: message,
        tipo,
        referenciaId
      });
      await nuevaNotif.save();
    } else {
      nuevaNotif = yaExiste; // Reutilizamos para el payload del socket
    }
  } catch (dbErr) {
    console.error('Error al guardar historial de notificación:', dbErr);
  }
}

  // 2. 🟢 TIEMPO REAL (SOCKET.IO): Ideal para tu iPhone 6s
  if (global.io && usuarioId) {
    // Si se guardó en BD mandamos el documento completo, si no, armamos un objeto rápido para el Toastr
    const payloadSocket = nuevaNotif || { titulo: title, mensaje: message, tipo, referenciaId, createdAt: new Date() };
    global.io.to(usuarioId.toString()).emit('notificacion-recibida', payloadSocket);
    console.log(`[Socket] Emitido con éxito a la sala: ${usuarioId}`);
  }

  // 3. 🌐 SEGUNDO PLANO (WEB PUSH): Para los navegadores y equipos compatibles
  if (userSubscription && userSubscription.endpoint) {
    // CORRECCIÓN: Ahora 'url' sí existe porque entra por parámetro
    const payloadPush = JSON.stringify({
      notification: {
        title,
        body: message,
        icon: 'hhttps://admin.zlipmenu.com/assets/icons/icon-128x128.png',
        vibrate: [100, 50, 100],
        data: { url }
      }
    });

    try {
      await webpush.sendNotification(userSubscription, payloadPush);
      console.log(`[WebPush] Notificación enviada con éxito.`);
    } catch (error) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log(`[WebPush] Suscripción expirada para el endpoint: ${userSubscription.endpoint}`);
        // Lanzamos el error hacia arriba para que el controlador elimine la sub de la BD si es necesario
        throw error;
      }
    }
  }
};

module.exports = {
    sendNotification
};
