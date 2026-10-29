const MercadoLibreConfig = require('../models/MercadoLibreConfig');
const Producto = require('../models/producto');
const { reducir_stock_internal } = require('./productoController'); // Ajusta la ruta exacta a tu controlador de productos
const axios = require('axios');

async function recibirWebhookMercadoLibre(req, res) {
    try {
        // 1. Mercado Libre envía los datos en el body de la petición
        const { topic, resource, user_id } = req.body;

        // Responder de inmediato con un 200 OK a Mercado Libre para indicarle que recibimos la alerta.
        // Si tardamos más de unos segundos en responder, Mercado Libre pensará que el servidor se cayó y reintentará el envío.
        res.status(200).json({ ok: true });

        // 2. Solo nos interesan las notificaciones de órdenes de compra
        if (topic !== 'orders') return;

        console.log(`[SaaS Webhook] Nueva notificación de compra para el vendedor de ML: ${user_id}`);

        // 3. Buscar las credenciales de la tienda (tenant) dueña de ese user_id de Mercado Libre
        const configML = await MercadoLibreConfig.findOne({ mel_user_id: user_id.toString() });
        if (!configML) {
            console.error(`[SaaS Webhook Error] No se encontró ninguna tienda vinculada al ID de usuario de ML: ${user_id}`);
            return;
        }

        // 4. Validar y refrescar el Access Token si está por expirar
        let token = configML.access_token;
        const ahora = new Date();
        if (ahora.getTime() >= (configML.expires_at.getTime() - (5 * 60 * 1000))) {
            const respuestaML = await axios.post('https://mercadolibre.com', null, {
                params: {
                    grant_type: 'refresh_token',
                    client_id: process.env.MELI_CLIENT_ID,
                    client_secret: process.env.MELI_CLIENT_SECRET,
                    refresh_token: configML.refresh_token
                }
            });
            configML.access_token = respuestaML.data.access_token;
            configML.refresh_token = respuestaML.data.refresh_token;
            configML.expires_at = new Date(Date.now() + respuestaML.data.expires_in * 1000);
            await configML.save();
            token = configML.access_token;
        }

        // 5. Consultar el detalle completo de la orden a Mercado Libre utilizando el 'resource' recibido
        // El 'resource' ya viene estructurado como "/orders/XXXXXXX"
        const detalleOrden = await axios.get(`https://mercadolibre.com${resource}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const itemsComprados = detalleOrden.data.order_items;

        // 6. Recorrer los artículos de la compra y descontar stock localmente
        for (const item of itemsComprados) {
            const mlItemId = item.item.id; // El ID de Mercado Libre del producto (ej: "MLV1234567")
            const cantidadComprada = item.quantity;

            // Buscamos el producto en nuestra base de datos local que coincida con ese id de Mercado Libre
            const productoLocal = await Producto.findOne({ 'mercadolibre.id': mlItemId });

            if (productoLocal) {
                console.log(`[SaaS Webhook] Descontando ${cantidadComprada} unidad(es) del producto local: ${productoLocal.titulo.es}`);
                
                // 🚀 Usamos tu función interna existente para restar stock en MongoDB
                await reducir_stock_internal(productoLocal._id, cantidadComprada);
            } else {
                console.warn(`[SaaS Webhook] Se vendió el ítem ${mlItemId} en ML pero no está vinculado a ningún producto local del SaaS.`);
            }
        }

    } catch (error) {
        console.error('Error procesando el Webhook de Mercado Libre:', error.response?.data || error.message);
        // Nota: Ya enviamos el status 200 arriba, por lo que el catch maneja los logs internos sin romper la petición.
    }
}

module.exports = {
    recibirWebhookMercadoLibre
};
