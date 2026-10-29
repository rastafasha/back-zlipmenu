// controllers/mercadolibre_config.js
const Usuario = require('../models/usuario'); // Tu modelo 'user'
const MercadoLibreConfig = require('../models/MercadoLibreConfig');

async function guardarOActualizarConfigML(req, res) {
    const uid = req.uid; // Extraído de tu middleware validarJWT
    const { client_id, client_secret, redirect_uri } = req.body;

    // 1. Validaciones de campos requeridos
    if (!client_id || !client_secret || !redirect_uri) {
        return res.status(400).json({
            ok: false,
            msg: 'Todos los campos son obligatorios: client_id, client_secret y redirect_uri.'
        });
    }

    try {
        // 2. Buscar al usuario para determinar su tienda (local)
        const usuarioDB = await Usuario.findById(uid);
        if (!usuarioDB || !usuarioDB.local) {
            return res.status(404).json({
                ok: false,
                msg: 'No se encontró la tienda asociada a tu cuenta de usuario.'
            });
        }

        const id_tienda = usuarioDB.local;

        // 3. Guardar en la base de datos de manera aislada (Multi-Tenant)
        // Usamos findOneAndUpdate con upsert para crear o actualizar en un solo paso
        const configActualizada = await MercadoLibreConfig.findOneAndUpdate(
            { tienda: id_tienda }, // Criterio de búsqueda por inquilino
            {
                tienda: id_tienda,
                client_id: client_id.trim(),
                client_secret: client_secret.trim(),
                redirect_uri: redirect_uri.trim(),
                status: 'CONFIGURADO', // Estado base inicial antes del login OAuth
                updatedAt: new Date()
            },
            { upsert: true, new: true } // Si no existe lo crea, y retorna el objeto nuevo
        );

        return res.status(200).json({
            ok: true,
            msg: 'Credenciales de Mercado Libre guardadas exitosamente.',
            config: {
                client_id: configActualizada.client_id,
                redirect_uri: configActualizada.redirect_uri,
                status: configActualizada.status,
                updatedAt: configActualizada.updatedAt
            }
        });

    } catch (error) {
        console.error('Error al guardar configuración ML:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor, hable con el administrador.',
            error: error.message
        });
    }
}

// 💡 Endpoint útil complementario para pintar los inputs en tu frontend de Angular/React
async function obtenerConfigML(req, res) {
    const uid = req.uid;

    try {
        const usuarioDB = await Usuario.findById(uid);
        if (!usuarioDB || !usuarioDB.local) {
            return res.status(404).json({ ok: false, msg: 'Tienda no encontrada.' });
        }

        // Buscamos la configuración actual y ocultamos el client_secret por seguridad
        const config = await MercadoLibreConfig.findOne({ tienda: usuarioDB.local }, '-client_secret');
        
        return res.status(200).json({
            ok: true,
            config: config || null // Retorna null si nunca se ha configurado nada
        });

    } catch (error) {
        return res.status(500).json({ ok: false, msg: 'Error al obtener la configuración.' });
    }
}

module.exports = {
    guardarOActualizarConfigML,
    obtenerConfigML
};
