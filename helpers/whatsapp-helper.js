const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
// Usamos el nombre correcto de tu modelo de MongoDB
const Tienda = require('../models/tienda'); 
const { procesarMensajeBot } = require('../controllers/whatsappBotController'); // Ajusta la ruta exacta


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
        webVersionCache: {
            type: 'none' // Evita cachés HTML corruptas o desactualizadas en Render
        },
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Vital en Render para evitar fallos de memoria compartida
                '--disable-gpu',
                '--no-first-run',
                '--disable-extensions'
            ]
        }
    });

    clientesActivos[restauranteId] = client;

    client.on('qr', async (qr) => {
        try {
            console.log(`✨ QR generado para el local: ${restauranteId}`);
            await Tienda.findByIdAndUpdate(restauranteId, {
                whatsappStatus: 'ESPERANDO_QR',
                whatsappQR: qr
            });
        } catch (error) {
            console.error(`Error guardando QR para ${restauranteId}:`, error);
        }
    });

    client.on('ready', async () => {
        try {
            console.log(`🚀 ¡WhatsApp conectado para el local: ${restauranteId}!`);
            await Tienda.findByIdAndUpdate(restauranteId, {
                whatsappStatus: 'CONECTADO',
                whatsappQR: '',
                whatsappConnectedAt: new Date()
            });
        } catch (error) {
            console.error(`Error actualizando estado READY para ${restauranteId}:`, error);
        }
    });

    client.on('disconnected', async (reason) => {
        console.warn(`⚠️ WhatsApp desconectado para ${restauranteId}: ${reason}`);
        delete clientesActivos[restauranteId];
        await Tienda.findByIdAndUpdate(restauranteId, {
            whatsappStatus: 'DESCONECTADO',
            whatsappQR: ''
        }).catch(() => {});
    });

    client.on('message', async (message) => {
        try {
            await procesarMensajeBot(restauranteId, message, client);
        } catch (error) {
            console.error(`Error procesando mensaje en ${restauranteId}:`, error);
        }
    });

    // Captura el error de inyección (Socket null) para que NO tumbe el servidor
    client.initialize().catch(async (err) => {
        console.error(`❌ Error al inicializar WhatsApp para ${restauranteId}:`, err.message);
        delete clientesActivos[restauranteId]; // Limpia el cliente roto para permitir reintentos
        await Tienda.findByIdAndUpdate(restauranteId, {
            whatsappStatus: 'ERROR',
            whatsappQR: ''
        }).catch(() => {});
    });

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

const enviarFacturaWhatsApp = async (restauranteId, telefono, mensaje, fileBuffer, fileName) => {
    try {
        // 1. Obtener o crear el cliente del restaurante específico
        const client = crearClienteWhatsApp(restauranteId);

        // 2. Validación de seguridad: Verificar si la sesión está lista
        if (!client || !client.info) {
            console.log(`⏳ El bot del local ${restauranteId} requiere escaneo QR o está cargando.`);
            return false;
        }

        const chatId = `${telefono.replace(/\D/g, '')}@c.us`;

        // 3. Validar si el usuario existe en WhatsApp
        const existeEnWhatsApp = await client.isRegisteredUser(chatId);
        if (!existeEnWhatsApp) {
            console.log(`⚠️ El número ${telefono} no tiene WhatsApp activo.`);
            return false;
        }

        // 4. Convertir el buffer del PDF recibido de Angular a Base64 en caliente
        const media = new MessageMedia(
            'application/pdf', 
            fileBuffer.toString('base64'), 
            fileName
        );

        // 5. Enviar el texto y luego el documento PDF adjunto
        await client.sendMessage(chatId, mensaje);
        await client.sendMessage(chatId, media);
        
        console.log(`✅ Factura PDF enviada con éxito a: ${telefono} (Local: ${restauranteId})`);
        return true;
    } catch (error) {
        console.error(`❌ Error enviando Factura PDF en local ${restauranteId}:`, error.message);
        return false;
    }
};

module.exports = { 
    crearClienteWhatsApp, 
    enviarMensajeWhatsApp,
    enviarFacturaWhatsApp
};
