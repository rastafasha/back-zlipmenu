const axios = require('axios');
const cron = require('node-cron');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definición exacta de tus modelos
const Tasadollarbcv = mongoose.model('tasadollarbcv', Schema({
    precio_dia: { type: Number, required: true, default: 0 }
}, { collection: 'tasadollarbcv', timestamps: true }));

const Tasaeurobcv = mongoose.model('tasaeurobcv', Schema({
    precio_dia: { type: Number, required: true, default: 0 }
}, { collection: 'tasaeurobcv', timestamps: true }));

/**
 * Función que extrae la data oficial del BCV y actualiza MongoDB Atlas
 */
async function sincronizarTasasOficiales() {
    try {
        console.log('🔄 Consultando endpoints estables de DolarApi...');

        // Lanzamos las peticiones HTTP en paralelo para no colgar la red de Movilnet
        const [resDolar, resEuro] = await Promise.all([
            axios.get('https://ve.dolarapi.com/v1/dolares/oficial'),
            axios.get('https://ve.dolarapi.com/v1/euros/oficial')
        ]);

// Extracción segura y redondeo estándar a 2 decimales (USD: 582.69 | EUR: 671.42)
        const valorDolar = parseFloat(
            (resDolar.data.promedio || resDolar.data.oficial || resDolar.data.precio).toFixed(2)
        );
        const valorEuro = parseFloat(
            (resEuro.data.promedio || resEuro.data.oficial || resEuro.data.precio).toFixed(2)
        );

        // Auditoría previa a la escritura en base de datos
        console.log(`[DolarApi Verificado] USD: ${valorDolar} VES | EUR: ${valorEuro} VES`);

        // Validación estricta anti-corrupción de datos
        if (isNaN(valorDolar) || isNaN(valorEuro) || valorDolar <= 0 || valorEuro <= 0) {
            throw new Error('La API devolvió un formato no numérico o valores inválidos.');
        }

        // 2. Actualización del CRUD de Dólar (Sobrescribe o crea el registro único)
        await Tasadollarbcv.updateOne({}, { 
            $set: { precio_dia: valorDolar } 
        }, { upsert: true });

        // 3. Actualización del CRUD de Euro (Sobrescribe o crea el registro único)
        await Tasaeurobcv.updateOne({}, { 
            $set: { precio_dia: valorEuro } 
        }, { upsert: true });

        return { usd: valorDolar, eur: valorEuro };


    } catch (error) {
        console.error('❌ Error en el sync automático de tasas:', error.message);
        return null;
    }
}

/**
 * TAREA PROGRAMADA: De Lunes a Viernes a las 5:00 PM (Hora de Venezuela)
 */
cron.schedule('0 17 * * 1-5', async () => {
    console.log('⏰ Ejecutando actualización cambiaria automática de la tarde...');
    await sincronizarTasasOficiales();
}, {
    scheduled: true,
    timezone: "America/Caracas"
});

module.exports = { sincronizarTasasOficiales };
