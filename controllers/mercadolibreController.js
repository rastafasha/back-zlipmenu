// controllers/mercadolibre.controller.js
const MercadoLibreConfig = require('../models/MercadoLibreConfig');
const axios = require('axios');

async function mercadoLibreCallback(req, res) {
    try {
        const { code, state } = req.query; // 'state' contiene el ID de la tienda local

        if (!code || !state) {
            return res.status(400).json({ ok: false, msg: 'Faltan parámetros del flujo OAuth.' });
        }

        // 1. Recuperar los datos de la App de Mercado Libre que el cliente guardó previamente
        const configML = await MercadoLibreConfig.findOne({ tienda: state });
        if (!configML) {
            return res.status(404).json({ ok: false, msg: 'No se encontraron registros de configuración para esta tienda.' });
        }

        // 2. Intercambiar el código usando los identificadores únicos de ESTE comercio
        const respuestaML = await axios.post('https://mercadolibre.com', null, {
            params: {
                grant_type: 'authorization_code',
                client_id: configML.client_id,        // 👈 Dinámico desde BD
                client_secret: configML.client_secret,  // 👈 Dinámico desde BD
                code: code,
                redirect_uri: configML.redirect_uri   // 👈 Dinámico desde BD
            }
        });

        const { access_token, refresh_token, expires_in, user_id } = respuestaML.data;
        const tiempoExpiracion = new Date(Date.now() + expires_in * 1000);

        const infoUsuario = await axios.get(`https://mercadolibre.com{user_id}`, {
            headers: { 'Authorization': `Bearer ${access_token}` }
        });

        // 3. Guardar los tokens dentro de la misma configuración del tenant
        configML.access_token = access_token;
        configML.refresh_token = refresh_token;
        configML.expires_at = tiempoExpiracion;
        configML.mel_user_id = user_id;
        configML.nickname = infoUsuario.data.nickname;
        configML.status = 'CONECTADO';
        configML.updatedAt = new Date();
        
        await configML.save();

        // 4. Redirección final al subdominio o URL de tu frontend (puedes estructurar FRONTEND_URL en tu .env o sacarla de la tienda)
        return res.redirect(`${process.env.FRONTEND_URL}/admin/configuracion?meli=success`);

    } catch (error) {
        console.error('Error en Callback Multi-Tenant:', error.response?.data || error.message);
        return res.redirect(`${process.env.FRONTEND_URL}/admin/configuracion?meli=error`);
    }
}

async function obtenerUrlVinculacionML(req, res) {
    try {
        const uid = req.uid;

        // 1. Poblamos el local para acceder a su campo 'pais'
        const usuarioDB = await Usuario.findById(uid).populate('local');
        if (!usuarioDB || !usuarioDB.local) {
            return res.status(404).json({ ok: false, msg: 'No se encontró la tienda asociada.' });
        }

        const tienda = usuarioDB.local;

        const configML = await MercadoLibreConfig.findOne({ tienda: tienda._id });
        if (!configML) {
            return res.status(404).json({ ok: false, msg: 'Primero configure sus credenciales de App (Client ID).' });
        }

        // 2. 🌟 DEDUCCIÓN AUTOMÁTICA DEL PAÍS
        const regionMeli = obtenerConfiguracionPorPais(tienda.pais);

        // 3. Construimos la URL regional obligatoria exigida por Developers
        const urlAutorizacion = `https://${regionMeli.auth_domain}/authorization?response_type=code&client_id=${configML.client_id}&redirect_uri=${encodeURIComponent(configML.redirect_uri)}&state=${tienda._id}`;

        return res.json({
            ok: true,
            url: urlAutorizacion
        });

    } catch (error) {
        return res.status(500).json({ ok: false, msg: 'Error al generar la URL.' });
    }
}

module.exports = {
    mercadoLibreCallback,
    obtenerUrlVinculacionML
};
