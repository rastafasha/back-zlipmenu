const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Inicializa el cliente emulando WhatsApp Web con sesión persistente
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './whatsapp-session' }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Clave para servidores VPS
    }
});

// Pinta el QR en la consola de comandos al arrancar si no está enlazado
client.on('qr', (qr) => {
    console.log('✨ [ZlipBot] Escanea este código QR con tu WhatsApp para conectar el sistema:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('🚀 ¡WhatsApp conectado y listo para enviar recordatorios!');
});

client.initialize();

/**
 * Función global para enviar mensajes gratis
 * @param {String} telefono - Número internacional (ej: 584120000000)
 * @param {String} mensaje - Texto formateado
 */
const enviarMensajeWhatsApp = async (telefono, mensaje) => {
    try {
        const chatId = `${telefono}@c.us`;
        await client.sendMessage(chatId, mensaje);
        console.log(`✅ Mensaje enviado con éxito a: ${telefono}`);
        return true;
    } catch (error) {
        console.error(`❌ Error enviando WhatsApp a ${telefono}:`, error.message);
        return false;
    }
};

module.exports = { enviarMensajeWhatsApp };
