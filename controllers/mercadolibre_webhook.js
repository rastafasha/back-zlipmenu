const MercadoLibreConfig = require('../models/MercadoLibreConfig');
const Producto = require('../models/producto');
const { reducir_stock_internal } = require('./productoController'); // Ajusta la ruta exacta a tu controlador de productos
const axios = require('axios');
const MeliOrden = require('../models/meliorden');
const Venta = require('../models/venta');

async function recibirWebhookMercadoLibre(req, res) {
    console.log('📩 Webhook recibido:', req.body);
    try {
        const { topic, resource, user_id } = req.body;

        // 1. Responder de inmediato con un 200 OK a Mercado Libre para evitar reintentos duplicados
        res.status(200).json({ ok: true });

        // 2. Validamos que la notificación sea sobre una orden/venta (sin volver a enviar res.status)
        if (topic !== 'orders' && (!resource || !resource.includes('/orders/'))) {
            return;
        }

        console.log(`[SaaS Webhook] Nueva notificación de compra para el vendedor de ML: ${user_id}`);

        const configML = await MercadoLibreConfig.findOne({ mel_user_id: user_id.toString() });
        if (!configML) {
            console.error(`[SaaS Webhook Error] No se encontró ninguna tienda vinculada al ID de usuario de ML: ${user_id}`);
            return;
        }

        let token = configML.access_token;
        let itemsComprados = [];
        let buyerNickname = 'Comprador Anónimo';
        let totalOrden = 0;

        // 🚀 MOCK MODE: Si detecta el token simulado de tus pruebas en Postman
        if (token === 'APP_USR-SIMULADO-TOKEN-123456') {
            console.log('🧪 [MOCK WEBHOOK] Simulando lectura de orden desde Mercado Libre...');

            // Buscamos cualquier producto de esa tienda que ya esté enlazado a Mercado Libre
            const productoEnlazado = await Producto.findOne({
                local: configML.tienda,
                'mercadolibre.id': { $exists: true, $ne: null }
            });

            if (!productoEnlazado) {
                console.warn('⚠️ [MOCK WEBHOOK] No tienes ningún producto exportado a MeLi en esta tienda para simular la compra.');
                return;
            }

            itemsComprados = [
                {
                    item: { id: productoEnlazado.mercadolibre.id },
                    quantity: 2,
                    unit_price: productoEnlazado.precio_ahora
                }
            ];
            buyerNickname = 'CLIENTE_MELI_TEST';
            totalOrden = productoEnlazado.precio_ahora * 2;

        } else {
            // 🔥 FLUJO REAL DE PRODUCCIÓN
            const ahora = new Date();

            // Refrescar el Access Token si está por expirar
            if (ahora.getTime() >= (configML.expires_at.getTime() - (5 * 60 * 1000))) {
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

            // Consultar el detalle real de la orden en la API oficial
            const detalleOrden = await axios.get(`https://api.mercadolibre.com${resource}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            itemsComprados = detalleOrden.data.order_items;
            buyerNickname = detalleOrden.data.buyer?.nickname || 'Comprador ML';
            totalOrden = detalleOrden.data.total_amount || 0;
        }

        // 3. Procesar el descuento de inventario por cada artículo vendido
        let totalUnidadesVendidas = 0;

        for (const item of itemsComprados) {
            const mlItemId = item.item.id;
            const cantidadComprada = item.quantity;

            const productoLocal = await Producto.findOne({ 'mercadolibre.id': mlItemId });

            if (productoLocal) {
                console.log(`[SaaS Webhook] Descontando ${cantidadComprada} unidad(es) del producto local: ${productoLocal.titulo.es}`);
                await reducir_stock_internal(productoLocal._id, cantidadComprada);
                totalUnidadesVendidas += cantidadComprada;
            } else {
                console.warn(`[SaaS Webhook] El ítem ${mlItemId} no está enlazado a ningún producto de la base de datos local.`);
            }
        }

        // 📊 4. AQUÍ VA EL REGISTRO PARA EL GRÁFICO DE VENTAS:
        // Se ejecuta una sola vez por orden completa, después de descontar el stock
        if (!existeOrden) {
            // 1. Guardas en MeliOrden (para tu gráfico de barras)
            const nuevaOrdenMeli = new MeliOrden({
                tienda: configML.tienda,
                meli_order_id: orderIdLimpio,
                buyer_nickname: buyerNickname,
                total_amount: totalOrden,
                currency_id: 'USD',
                items_count: totalUnidadesVendidas,
                fecha: new Date()
            });
            await nuevaOrdenMeli.save();

            // 2. Registras la Venta unificada para tu Manejador / Auditoría
            const mydate = new Date();
            const nuevaVenta = new Venta({
                local: configML.tienda,
                origen: 'MERCADOLIBRE',
                meli_order_id: orderIdLimpio,
                idtransaccion: `ML-${orderIdLimpio}`,
                total_pagado: totalOrden,

                // Datos de envío (en producción los extraes de detalleOrden.data.shipping)
                tipo_envio: 'Mercado Envíos / Por definir',
                precio_envio: '0',
                tiempo_estimado: 'Por confirmar',
                direccion: 'Dirección gestionada en Mercado Libre',
                destinatario: buyerNickname,
                referencia: `Orden ML #${orderIdLimpio}`,
                pais: 'Venezuela',
                ciudad: 'Por confirmar',
                zip: '0000',

                day: mydate.getDate().toString(),
                month: (mydate.getMonth() + 1).toString(),
                year: mydate.getFullYear().toString(),
                estado: 'Venta en proceso'
            });

            const ventaGuardada = await nuevaVenta.save();

            // 3. Guardas el Detalle de los productos (para que el botón morado del carrito muestre los ítems)
            for (const item of itemsComprados) {
                const productoLocal = await Producto.findOne({ 'mercadolibre.id': item.item.id });
                if (productoLocal) {
                    const nuevoDetalle = new Detalle({
                        local: configML.tienda,
                        venta: ventaGuardada._id,
                        producto: productoLocal._id,
                        cantidad: item.quantity,
                        precio: item.unit_price
                    });
                    await nuevoDetalle.save();
                }
            }

            console.log(`✅ [AUDITORÍA] Venta ML #${orderIdLimpio} sincronizada en el panel de órdenes.`);
        }



    } catch (error) {
        console.error('Error procesando el Webhook de Mercado Libre:', error.response?.data || error.message);
    }
}

module.exports = {
    recibirWebhookMercadoLibre
};
