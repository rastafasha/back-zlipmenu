const cron = require('node-cron');
const Reservacion = require('../models/reservacion'); // Ajusta tu ruta
const { enviarMensajeWhatsApp } = require('../helpers/whatsapp-helper');

// Se ejecuta solo en el minuto 0 de cada hora automáticamente
cron.schedule('0 * * * *', async () => {
    console.log('⏰ Ejecutando verificador de recordatorios por WhatsApp...');

    try {
        // Buscamos mesas confirmadas que no hayan sido notificadas aún
        const reservasProximas = await Reservacion.find({
            status: 'Confirmada',
            notificado_whatsapp: { $ne: true }
        }).populate('local');

        for (const reserva of reservasProximas) {
            const telefonoDestino = formatearTelefono(reserva.telefono);
            const nombreCliente = `${reserva.first_name} ${reserva.last_name}`;
            const nombreRestaurante = reserva.local?.nombre || 'el restaurante';
            
            // Texto limpio y estructurado con las negritas de WhatsApp
            const textoMensaje = `¡Hola, ${nombreCliente}! 👋 Te recordamos tu reservación para hoy en *${nombreRestaurante}*.\n\n` +
                                 `🗓️ *Fecha:* ${reserva.fecha}\n` +
                                 `⏰ *Hora:* ${reserva.hora}\n` +
                                 `👥 *Personas:* ${reserva.personas}\n\n` +
                                 `Te estaremos esperando. ¡Buen provecho! 🍽️`;

            const enviado = await enviarMensajeWhatsApp(telefonoDestino, textoMensaje);

            if (enviado) {
                reserva.notificado_whatsapp = true;
                await reserva.save(); // Cerramos el ciclo para no repetir el mensaje
            }
        }

    } catch (error) {
        console.error('Error en el cron de recordatorios:', error);
    }
});

// Limpia el string y le clava el 58 de Venezuela si arranca en 0
function formatearTelefono(tel) {
    let limpio = tel.replace(/\D/g, ''); 
    if (limpio.startsWith('0')) {
        limpio = '58' + limpio.substring(1); 
    }
    return limpio;
}
