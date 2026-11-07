const { response } = require('express');
const Producto = require('../models/producto');
const axios = require('axios');
const { obtenerConfiguracionPorPais } = require('../helpers/meli-regions'); // Ajusta la ruta a tu archivo real


// ==========================================
// MERCADO LIBRE CONTROLADORES CORREGIDOS
// ==========================================

async function exportarAMercadoLibre(req, res) {
    try {
        const { id_producto } = req.params;
        const accessToken = req.accessTokenMercadoLibre; 

        if (!accessToken) {
            return res.status(401).json({ mensaje: 'No estás vinculado o autorizado con Mercado Libre.' });
        }

        const productoLocal = await Producto.findById(id_producto)
            .populate('categoria')
            .populate('local');

        if (!productoLocal) {
            return res.status(404).json({ mensaje: 'El producto seleccionado no existe.' });
        }

        // 🚀 MOCK MODE INTEGRADO: Si estamos en el entorno de pruebas del Paso 2
        if (accessToken === 'APP_USR-SIMULADO-TOKEN-123456') {
            console.log(`🧪 [MOCK EXPORTACIÓN] Sincronizando en local producto masivo: "${productoLocal.titulo.es}"`);
            
            // Si no tiene ID asignado previamente, generamos uno aleatorio
            const mlIdSimulado = productoLocal.mercadolibre?.id || `MLV${Math.floor(100000000 + Math.random() * 900000000)}`;

            productoLocal.mercadolibre = {
                id: mlIdSimulado,
                status: 'active',
                last_sync: new Date()
            };
            await productoLocal.save();

            return res.json({
                success: true,
                mensaje: '¡Producto exportado e indexado con éxito (Simulación local)!',
                ml_id: mlIdSimulado
            });
        }

        // ==========================================
        // 🔒 FLUJO DE PRODUCCIÓN REAL (Solo corre si usas tokens verdaderos de MeLi)
        // ==========================================
        
        // Extraemos la configuración geográfica
        const configPais = obtenerConfiguracionPorPais(productoLocal.local?.pais);
        const site_id = configPais ? configPais.site_id : 'MLV'; // Respaldo por defecto en Venezuela si viene vacío

        // Salvavidas de categoría: Si nació del Excel y está vacía, le inyectamos la de Alimentos de su país
        let categoriaML = productoLocal.categoria?.mercadolibre_category_id; 
        if (!categoriaML) {
            categoriaML = `${site_id}1403`; // Ej: MLV1403 (Comidas y Bebidas)
        }

        // Validación estricta de prefijos regionales
        if (!categoriaML.startsWith(site_id)) {
            return res.status(400).json({
                mensaje: `Conflicto de región: La categoría configurada (${categoriaML}) no coincide con el prefijo del país de tu tienda (${site_id}).`
            });
        }

        if (productoLocal.precio_ahora < 1) {
            return res.status(400).json({ mensaje: 'Mercado Libre exige un precio mínimo de venta de 1.00 USD.' });
        }

        const monedaTienda = productoLocal.local?.moneda || 'USD';

        const jsonMercadoLibre = {
            title: productoLocal.titulo.es,
            category_id: categoriaML,
            price: productoLocal.precio_ahora,
            currency_id: monedaTienda,
            available_quantity: productoLocal.stock,
            buying_mode: "buy_it_now",
            condition: productoLocal.condition || "new",
            listing_type_id: "gold_special",
            pictures: [{ source: productoLocal.img }]
        };

        if (productoLocal.mercadolibre && productoLocal.mercadolibre.id) {
            const mlId = productoLocal.mercadolibre.id;

            // 🛠️ CORREGIDO: Endpoint oficial de actualización de Mercado Libre API (/items/:id)
            await axios.put(`https://mercadolibre.com{mlId}`, jsonMercadoLibre, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            productoLocal.mercadolibre.last_sync = new Date();
            await productoLocal.save();

            return res.json({
                success: true,
                mensaje: 'La publicación de Mercado Libre ha sido actualizada correctamente.',
                ml_id: mlId
            });
        } else {
            // 🛠️ CORREGIDO: Endpoint oficial de creación masiva de ítems de Mercado Libre API
            const respuestaML = await axios.post('https://mercadolibre.com', jsonMercadoLibre, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            productoLocal.mercadolibre = {
                id: respuestaML.data.id,
                status: respuestaML.data.status,
                last_sync: new Date()
            };
            await productoLocal.save();

            return res.json({
                success: true,
                mensaje: '¡Producto exportado e indexado con éxito en Mercado Libre!',
                ml_id: respuestaML.data.id
            });
        }

    } catch (error) {
        console.error('Error de Sincronización Mercado Libre:', error.response?.data || error.message);
        return res.status(500).json({
            mensaje: 'No se pudo sincronizar el producto con Mercado Libre.',
            detalles: error.response?.data || error.message
        });
    }
}

async function actualizarStockYPrecioEnML(id_producto) {
    try {
        const producto = await Producto.findById(id_producto).populate('local');

        // 🚀 VERIFICACIÓN MAESTRA: Si el local no tiene activa la integración, cortamos el flujo de inmediato
        if (!producto || !producto.local || !producto.local.usaMercadoLibre) return;
        
        if (!producto.mercadolibre || !producto.mercadolibre.id) return;

        const configML = await MercadoLibreConfig.findOne({ tienda: producto.local._id });
        if (!configML) return;

        let token = configML.access_token;
        const ahora = new Date();
        
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

        const mlItemId = producto.mercadolibre.id;
        
        // 🛠️ CORREGIDO: Sintaxis de template string y endpoint oficial de la API de items
        await axios.put(`https://mercadolibre.com{mlItemId}`, {
            price: producto.precio_ahora,
            available_quantity: producto.stock
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        producto.mercadolibre.last_sync = new Date();
        await producto.save();
        console.log(`[SaaS Sync] Producto ${id_producto} sincronizado automáticamente en ML.`);

    } catch (error) {
        console.error(`[SaaS Sync Error] Error al sincronizar el producto ${id_producto}:`, error.response?.data || error.message);
    }
}


module.exports = {
    exportarAMercadoLibre,
    actualizarStockYPrecioEnML,

};
