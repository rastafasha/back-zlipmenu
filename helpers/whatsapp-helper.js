const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Creamos un diccionario (objeto) en memoria para guardar las conexiones activas
// Ej: { "id_restaurante_1": client1, "id_restaurante_2": client2 }
const clientesActivos = {};

/**
 * 1. La función que me preguntaste: Crea la instancia dinámica
 */
const crearClienteWhatsApp = (restauranteId) => {
    // Si ya existe una conexión viva para este restaurante, la devolvemos y no creamos otra
    if (clientesActivos[restauranteId]) {
        return clientesActivos[restauranteId];
    }

    const client = new Client({
        authStrategy: new LocalAuth({ 
            clientId: restauranteId, // Agrupa la sesión bajo el ID del local
            dataPath: './whatsapp-sessions' 
        }),
        puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        }
    });

    // Escuchador del QR específico para este local
    client.on('qr', (qr) => {
        console.log(`✨ [ZlipBot] QR generado para el restaurante/clínica: ${restauranteId}`);
        qrcode.generate(qr, { small: true });
        // NOTA PARA EL LUNES: Aquí guardarás el string 'qr' en MongoDB para mandárselo a tu Angular
    });

    client.on('ready', () => {
        console.log(`🚀 ¡WhatsApp conectado para el local: ${restauranteId}!`);
    });

    client.initialize();

    // Guardamos este cliente en nuestro diccionario global antes de retornarlo
    clientesActivos[restauranteId] = client;
    return client;
};

/**
 * 2. Tu función de enviar mensajes adaptada para recibir el ID del local
 */
const enviarMensajeWhatsApp = async (restauranteId, telefono, mensaje) => {
    try {
        // Obtenemos o levantamos el cliente de este restaurante específico
        const client = crearClienteWhatsApp(restauranteId);

        // Esperamos un momento a que esté listo (por seguridad si se acaba de crear)
        if (!client.info) {
            console.log(`⏳ Esperando conexión del bot para el local ${restauranteId}...`);
            return false;
        }

        const chatId = `${telefono}@c.us`;

        // Validación de seguridad contra números sin WhatsApp (el caso del iPhone 5C)
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

// Exportamos ambas funciones para tener control total
module.exports = { crearClienteWhatsApp, enviarMensajeWhatsApp };
