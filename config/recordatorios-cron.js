const cron = require('node-cron');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const Reservacion = require('../models/reservacion'); // Ajusta tu ruta
const { enviarMensajeWhatsApp } = require('../helpers/whatsapp-helper');

// 1. Configuración de Nodemailer usando tu paquete smtp-transport
const transporter = nodemailer.createTransport(smtpTransport({
    host: process.env.HOST_EMAIL, // O cambia por el host de tu proveedor de correo
    port: process.env.PORT_EMAIL,
    secure: true,
    auth: {
        user: process.env.EMAIL_BACKEND, // Tu correo en el archivo .env
        pass: process.env.PASSWORD_APP  // Tu contraseña de aplicación en el archivo .env
    }
}));

// Se ejecuta cada 15 minutos automáticamente para mayor precisión temporal
cron.schedule('*/15 * * * *', async () => {
    console.log('⏰ Ejecutando verificador de recordatorios por WhatsApp y Email...');

    try {
        const ahora = new Date();
        // Ventana de tiempo: buscamos reservas de HOY. 
        // (Opcional: puedes limitar tu búsqueda en Mongo sumando filtros de fecha si lo requieres)

        // Buscamos mesas confirmadas que no hayan sido notificadas aún por NINGÚN medio
        const reservasProximas = await Reservacion.find({
            status: 'Confirmada',
            $or: [
                { notificado_whatsapp: { $ne: true } },
                { notificado_email: { $ne: true } }
            ]
        }).populate('local');

        for (const reserva of reservasProximas) {
            const telefonoDestino = formatearTelefono(reserva.telefono);
            const nombreCliente = `${reserva.first_name} ${reserva.last_name}`;
            const nombreRestaurante = reserva.local?.nombre || 'el restaurante';

            // Texto limpio y estructurado para WhatsApp (con asteriscos)
            const textoMensaje = `¡Hola, ${nombreCliente}! 👋 Te recordamos tu reservación para hoy en *${nombreRestaurante}*.\n\n` +
                `🗓️ *Fecha:* ${reserva.fecha}\n` +
                `⏰ *Hora:* ${reserva.hora}\n` +
                `👥 *Personas:* ${reserva.personas}\n\n` +
                `Te estaremos esperando. ¡Buen provecho! 🍽️`;

            // Texto adaptado para Email (puedes meterle etiquetas HTML si quieres luego)
            const textoEmail = `¡Hola, ${nombreCliente}! Te recordamos tu reservación para hoy en ${nombreRestaurante}.\n\n` +
                `Fecha: ${reserva.fecha}\n` +
                `Hora: ${reserva.hora}\n` +
                `Personas: ${reserva.personas}\n\n` +
                `Te estaremos esperando. ¡Buen provecho!`;

            // --- FLUJO DE WHATSAPP ---
            if (!reserva.notificado_whatsapp) {
                // 💥 AQUÍ VA EL CAMBIO: Extraemos el ID del local que viene de tu .populate('local')
                const localId = reserva.local?._id ? reserva.local._id.toString() : 'general';

                // Le pasamos localId como primer parámetro a tu nueva función multicliente
                const enviadoWS = await enviarMensajeWhatsApp(localId, telefonoDestino, textoMensaje);

                if (enviadoWS) {
                    reserva.notificado_whatsapp = true;
                }
            }

            // --- FLUJO DE EMAIL ---
            if (!reserva.notificado_email && reserva.email) { // Asegura que el modelo tenga el campo email
                try {
                    await transporter.sendMail({
                        from: process.env.EMAIL_BACKEND,
                        to: reserva.email,
                        subject: `Recordatorio de tu Reserva en ${nombreRestaurante} 🍽️`,
                        text: textoEmail
                    });
                    reserva.notificado_email = true;
                    console.log(`📧 Email enviado con éxito a: ${reserva.email}`);
                } catch (emailError) {
                    console.error(`❌ Error enviando Email a ${reserva.email}:`, emailError.message);
                }
            }

            // Guardamos los cambios en la base de datos si se disparó alguna notificación
            if (reserva.isModified('notificado_whatsapp') || reserva.isModified('notificado_email')) {
                await reserva.save();
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
