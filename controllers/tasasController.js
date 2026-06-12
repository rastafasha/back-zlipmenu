const axios = require('axios');
const cron = require('node-cron');
const UsdModel = require('../models/tasadollarbcv');   // Ajusta la ruta y el nombre exacto de tu modelo
const EuroModel = require('../models/tasaeurobcv'); // Ajusta la ruta y el nombre exacto de tu modelo

/**
 * Función que extrae los datos del BCV y actualiza tus dos CRUDs
 */
async function sincronizarTasasOficiales() {
    try {
        console.log('🔄 Consultando API externa del BCV...');

        // Consumimos el endpoint gratuito y estable para el BCV
        const response = await axios.get('https://vercel.app');
        const monedas = response.data.monedas;

        const valorDolar = parseFloat(monedas.usd.valor);
        const valorEuro = parseFloat(monedas.eur.valor);

        console.log(`[BCV Detectado] USD: ${valorDolar} | EUR: ${valorEuro}`);

        // 2. Actualizamos tu CRUD de Dólar (Machaca el registro único)
        await Tasadollarbcv.updateOne({}, { 
            $set: { precio_dia: valorDolar } 
        }, { upsert: true });

        // 3. Actualizamos tu CRUD de Euro (Machaca el registro único)
        await Tasaeurobcv.updateOne({}, { 
            $set: { precio_dia: valorEuro } 
        }, { upsert: true });

        console.log('✅ ¡Colecciones tasadollarbcv y tasaeurobcv sincronizadas!');
        return { usd: valorDolar, euro: valorEuro };

    } catch (error) {
        console.error('❌ Error en el sync automático de tasas:', error.message);
        return null;
    }
}

/**
 * ⏰ EL RELOJ AUTOMÁTICO DE TU SAAS:
 * Se activa solo en tu servidor de Render de Lunes a Viernes a las 5:00 PM (Hora de Venezuela)
 */


/**
 * 🧲 EL RELOJ BIOLÓGICO: Programación automática con Node-Cron
 * Se ejecuta automáticamente de Lunes a Viernes a las 5:00 PM (Hora de Venezuela)
 * que es cuando el BCV publica la tasa oficial para el día siguiente.
 */
cron.schedule('0 17 * * 1-5', async () => {
    console.log('⏰ Ejecutando tarea programada: Actualización de tasa BCV');
    await actualizarTasaBCV();
}, {
    scheduled: true,
    timezone: "America/Caracas" // Forzamos la zona horaria de Venezuela
});

// El día que actives México, solo agregas esto dentro de tu función de las 5:00 PM:
// const responseGlobal = await axios.get('https://er-api.com');
// const pesoMexicano = responseGlobal.data.rates.MXN; // Ej: 17.50

// Y actualizas tu CRUD internacional de la misma manera:
// await TasaPesoMexicano.updateOne({}, { $set: { precio_dia: pesoMexicano } }, { upsert: true });


module.exports = { sincronizarTasasOficiales };
