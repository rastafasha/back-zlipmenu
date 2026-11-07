// controllers/mercadolibre.controller.js
const MercadoLibreConfig = require('../models/MercadoLibreConfig');
const axios = require('axios');
const { obtenerConfiguracionPorPais } = require('../helpers/meli-regions'); // Ajusta la ruta a tu archivo real
const Usuario = require('../models/usuario');

async function mercadoLibreCallback(req, res) {
    try {
        const { code, state } = req.query;

        if (!code || !state) {
            return res.status(400).send('Faltan parámetros obligatorios (code/state).');
        }

        const configML = await MercadoLibreConfig.findOne({ tienda: state });
        if (!configML) {
            return res.status(404).send('No se encontró la configuración inicial de la tienda.');
        }

        let access_token, refresh_token, user_id, nickname;
        const fechaExpiracion = new Date();

        // 🚀 MOCK MODE: Si es un código de prueba local, simulamos la respuesta exitosa de MeLi
        if (code.startsWith('TG-PRUEBA')) {
            console.log('🧪 Simulación detectada. Procesando tokens ficticios para pruebas locales...');
            
            access_token = 'APP_USR-SIMULADO-TOKEN-123456';
            refresh_token = 'TG-SIMULADO-REFRESH-654321';
            user_id = 987654321;
            nickname = 'PIZZERIA_TEST_MELI';
            
            fechaExpiracion.setHours(fechaExpiracion.getHours() + 6); // Expira en 6 horas
        } else {
            // 🔥 FLUJO REAL: Solo se ejecuta si estás usando credenciales verdaderas de Mercado Libre
            const urlToken = 'https://mercadolibre.com';
            const payload = {
                grant_type: 'authorization_code',
                client_id: configML.client_id,
                client_secret: configML.client_secret,
                code: code,
                redirect_uri: configML.redirect_uri
            };

            const response = await axios.post(urlToken, new URLSearchParams(payload), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            access_token = response.data.access_token;
            refresh_token = response.data.refresh_token;
            user_id = response.data.user_id;
            
            fechaExpiracion.setSeconds(fechaExpiracion.getSeconds() + response.data.expires_in);

            // Consultar nickname real
            try {
                const resUser = await axios.get(`https://mercadolibre.com{user_id}`);
                nickname = resUser.data.nickname;
            } catch (err) {
                nickname = 'Vendedor Homologado';
            }
        }

        // 💾 Guardamos el estado final unificado en la base de datos
        configML.access_token = access_token;
        configML.refresh_token = refresh_token;
        configML.mel_user_id = user_id;
        configML.expires_at = fechaExpiracion;
        configML.nickname = nickname;
        configML.status = 'CONECTADO'; // Cambia el estatus de CONFIGURADO a CONECTADO 🎉

        await configML.save();
        console.log(`✅ Tienda ${state} vinculada exitosamente con el nickname: ${nickname}`);

        // Redirigimos al usuario al panel de Angular (ajusta la URL según tu puerto local)
        return res.redirect('http://localhost:4200/dashboard/tiendas?status=connected');

    } catch (error) {
        console.error('🔴 Error real en mercadoLibreCallback:', error.response?.data || error.message);
        return res.status(500).send('Error interno durante el intercambio de tokens con Mercado Libre.');
    }
}

async function obtenerUrlVinculacionML(req, res) {
    try {
        // 🚀 CORRECCIÓN: Ahora lee desde req.params porque viene en la estructura de la URL
        const { tiendaId } = req.params;

        if (!tiendaId) {
            return res.status(400).json({ ok: false, msg: 'El ID de la tienda es requerido.' });
        }

        const TiendaModel = require('../models/tienda');

        // 1. Buscamos la tienda directamente y le poblamos el país
        const tienda = await TiendaModel.findById(tiendaId);
        if (!tienda) {
            return res.status(404).json({ ok: false, msg: 'No se encontró la tienda especificada en el sistema.' });
        }

        // 2. Buscamos las credenciales de Mercado Libre asociadas a esa tienda
        const configML = await MercadoLibreConfig.findOne({ tienda: tienda._id });
        if (!configML) {
            return res.status(404).json({ ok: false, msg: 'Primero configure sus credenciales de App (Client ID).' });
        }

        // 3. Extraemos el código de país de forma segura ('VE')
        const codigoPais = (tienda.pais && typeof tienda.pais === 'object') ? tienda.pais.code : 'VE';
        console.log('🌍 Generando URL de vinculación para:', tienda.nombre, '| País:', codigoPais);

        // ... (El resto de tu lógica para obtener región, validar redirectUri y retornar la url se queda exactamente igual)
        const regionMeli = obtenerConfiguracionPorPais(codigoPais);
        if (!regionMeli || !regionMeli.auth_domain) {
            return res.status(400).json({ ok: false, msg: 'El país configurado no está soportado en Mercado Libre.' });
        }

        let redirectUri = configML.redirect_uri;
        if (!redirectUri.startsWith('http://') && !redirectUri.startsWith('https://')) {
            redirectUri = `https://${redirectUri}`;
        }

        // 🚀 EXTREMA PROTECCIÓN: Removemos CUALQUIER carácter que no sea una letra, número, punto o guion al inicio
        const dominioLimpio = regionMeli.auth_domain.replace(/^[^a-zA-Z0-9]+/, '').trim();

        // Construcción manual infalible: concatenamos el protocolo limpio con el dominio purificado
        const urlAutorizacion = `https://${dominioLimpio}/authorization?response_type=code&client_id=${configML.client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${tienda._id}`;

        return res.json({
            ok: true,
            url: urlAutorizacion
        });

    } catch (error) {
        console.error('🔴 Error detallado en obtenerUrlVinculacionML:', error);
        return res.status(500).json({ ok: false, msg: 'Error interno en el servidor.' });
    }
}



module.exports = {
    mercadoLibreCallback,
    obtenerUrlVinculacionML
};
