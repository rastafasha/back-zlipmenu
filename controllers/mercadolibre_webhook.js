const MercadoLibreConfig = require('../models/MercadoLibreConfig');
const Producto = require('../models/producto');
const { reducir_stock_internal } = require('./productoController'); // Ajusta la ruta exacta a tu controlador de productos
const axios = require('axios');

async function recibirWebhookMercadoLibre(req, res) {
    try {
        const { topic, resource, user_id } = req.body;

        // Responder de inmediato con un 200 OK a Mercado Libre para evitar reintentos duplicados
        res.status(200).json({ ok: true });

        if (topic !== 'orders') return;

        console.log(`[SaaS Webhook] Nueva notificación de compra para el vendedor de ML: ${user_id}`);

        const configML = await MercadoLibreConfig.findOne({ mel_user_id: user_id.toString() });
        if (!configML) {
            console.error(`[SaaS Webhook Error] No se encontró ninguna tienda vinculada al ID de usuario de ML: ${user_id}`);
            return;
        }

        let token = configML.access_token;
        const ahora = new Date();
        
        // Refrescar el Access Token de forma Multi-Tenant segura (Usando los campos del Inquilino de la BD)
        if (ahora.getTime() >= (configML.expires_at.getTime() - (5 * 60 * 1000))) {
            // 🛠️ CORREGIDO: URL de API global e identificadores del comercio correspondientes (No variables estáticas .env)
            const respuestaML = await axios.post('https://mercadolibre.com', null, {
                params: {
                    grant_type: 'refresh_token',
                    client_id: configML.client_id,
                    client_secret: configML.client_secret,
                    refresh_token: configML.refresh_token
                }
            });
            configML.access_token = respuestaML.data.access_token;
            configML.refresh_token = respuestaML.data.refresh_token;
            configML.expires_at = new Date(Date.now() + respuestaML.data.expires_in * 1000);
            await configML.save();
            token = configML.access_token;
        }

        // 🛠️ CORREGIDO: Petición HTTP dirigida a la API oficial de Mercado Libre
        const detalleOrden = await axios.get(`https://mercadolibre.com${resource}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const itemsComprados = detalleOrden.data.order_items;

        for (const item of itemsComprados) {
            const mlItemId = item.item.id; 
            const cantidadComprada = item.quantity;

            const productoLocal = await Producto.findOne({ 'mercadolibre.id': mlItemId });

            if (productoLocal) {
                console.log(`[SaaS Webhook] Descontando ${cantidadComprada} unidad(es) del producto local: ${productoLocal.titulo.es}`);
                await reducir_stock_internal(productoLocal._id, cantidadComprada);
            } else {
                console.warn(`[SaaS Webhook] El ítem ${mlItemId} no está enlazado a ningún producto de la base de datos local.`);
            }
        }

    } catch (error) {
        console.error('Error procesando el Webhook de Mercado Libre:', error.response?.data || error.message);
    }
}

module.exports = {
    recibirWebhookMercadoLibre
};
