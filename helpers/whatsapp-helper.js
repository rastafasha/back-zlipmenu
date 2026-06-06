const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
// Usamos el nombre correcto de tu modelo de MongoDB
const Tienda = require('../models/tienda'); 

const clientesActivos = {};

const crearClienteWhatsApp = (restauranteId) => {
    if (clientesActivos[restauranteId]) {
        return clientesActivos[restauranteId];
    }

    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: restauranteId, 
            dataPath: './whatsapp-sessions'
        }),
        puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        }
    });

    client.on('qr', async (qr) => {
        console.log(`✨ QR generado para el local: ${restauranteId}`);

        // Corregido: Usa Tienda
        await Tienda.findByIdAndUpdate(restauranteId, {
            whatsappStatus: 'ESPERANDO_QR',
            whatsappQR: qr 
        });
    });

    client.on('ready', async () => {
        console.log(`🚀 ¡WhatsApp conectado para el local: ${restauranteId}!`);

        // Corregido: Usa Tienda
        await Tienda.findByIdAndUpdate(restauranteId, {
            whatsappStatus: 'CONECTADO',
            whatsappQR: '', 
            whatsappConnectedAt: new Date()
        });
    });

    client.initialize();

    clientesActivos[restauranteId] = client;
    return client;
};

const enviarMensajeWhatsApp = async (restauranteId, telefono, mensaje) => {
    try {
        const client = crearClienteWhatsApp(restauranteId);

        // Modificación de seguridad: Si no está logueado el bot de este local, no dispares métodos internos
        if (!client || !client.info) {
            console.log(`⏳ El bot del local ${restauranteId} se está inicializando o requiere escaneo QR.`);
            return false;
        }

        const chatId = `${telefono}@c.us`;

        const existeEnWhatsApp = await client.isRegisteredUser(chatId);
        if (!existeEnWhatsApp) {
            console.log(`⚠️ El número ${telefono} no tiene WhatsApp activo.`);
            return false;
        }

        await client.sendMessage(chatId, mensaje);
        console.log(`✅ Mensaje enviado con éxito a: ${telefono} (Local: ${restauranteId})`);
        return true;
    } catch (error) {
        console.error(`❌ Error enviando WhatsApp en local ${restauranteId}:`, error.message);
        return false;
    }
};

module.exports = { crearClienteWhatsApp, enviarMensajeWhatsApp };
