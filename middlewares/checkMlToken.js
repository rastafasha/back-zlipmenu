const Usuario = require('../models/usuario'); 
const MercadoLibreConfig = require('../models/MercadoLibreConfig'); 
const axios = require('axios');

const verificarYRenovarTokenML = async (req, res, next) => {
    const uid = req.uid; 

    try {
        const usuarioDB = await Usuario.findById(uid);
        if (!usuarioDB || !usuarioDB.local) {
            return res.status(404).json({ ok: false, msg: 'Usuario o tienda no encontrados.' });
        }

        const id_tienda = usuarioDB.local;

        // Buscamos la configuración que contiene las credenciales de la app de ESTA tienda
        const configML = await MercadoLibreConfig.findOne({ tienda: id_tienda });
        if (!configML || !configML.client_id || !configML.client_secret) {
            return res.status(404).json({ ok: false, msg: 'Falta configurar las credenciales de Mercado Libre para esta tienda.' });
        }

        // Si el cliente solo guardó las credenciales de su App pero aún no ha hecho el flujo de login (OAuth)
        if (!configML.refresh_token) {
            return res.status(400).json({ ok: false, msg: 'Debes enlazar y autorizar tu cuenta de Mercado Libre primero.' });
        }

        const ahora = new Date();
        const margenSeguridad = 5 * 60 * 1000; 

        if (ahora.getTime() >= (configML.expires_at.getTime() - margenSeguridad)) {
            console.log(`[SaaS Multi-Tenant] Renovando token para la tienda: ${id_tienda}`);

            // 🚀 USAMOS LAS CREDENCIALES DEL CLIENTE DESDE LA BASE DE DATOS
            const respuestaML = await axios.post('https://mercadolibre.com', null, {
                params: {
                    grant_type: 'refresh_token',
                    client_id: configML.client_id,        // 👈 Desde Mongoose
                    client_secret: configML.client_secret,  // 👈 Desde Mongoose
                    refresh_token: configML.refresh_token
                }
            });

            configML.access_token = respuestaML.data.access_token;
            configML.refresh_token = respuestaML.data.refresh_token;
            configML.expires_at = new Date(Date.now() + respuestaML.data.expires_in * 1000);
            configML.status = 'CONECTADO';
            configML.updatedAt = new Date();
            await configML.save();
        }

        req.accessTokenMercadoLibre = configML.access_token;
        next();

    } catch (error) {
        console.error('Error en middleware multi-tenant ML:', error.response?.data || error.message);
        return res.status(401).json({ ok: false, msg: 'La conexión con Mercado Libre ha caducado. Vuelve a enlazar tu cuenta.' });
    }
};

module.exports = { verificarYRenovarTokenML };