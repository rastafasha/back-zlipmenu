// routes/mercadolibre.routes.js
const { Router } = require('express');
const router = Router();

const { mercadoLibreCallback, obtenerUrlVinculacionML,
    obtenerResumenVentasGrafico
 } = require('../controllers/mercadolibreController.js');
const { recibirWebhookMercadoLibre } = require('../controllers/mercadolibre_webhook.js');
const { guardarOActualizarConfigML, obtenerConfigML } = require('../controllers/mercadolibre_config.js');
const { validarJWT } = require('../middlewares/validar-jwt');


router.get('/callback', mercadoLibreCallback);
router.get('/url-vinculacion/:tiendaId', obtenerUrlVinculacionML);
router.get('/resumen/:tiendaId', obtenerResumenVentasGrafico);

// Ruta pública de escucha para los servidores de Mercado Libre
router.post('/webhook', recibirWebhookMercadoLibre);

// 🔐 Endpoints protegidos para el Panel de Configuración del SaaS
router.post('/config/store', [validarJWT], guardarOActualizarConfigML);
router.get('/config/get', [validarJWT], obtenerConfigML);


module.exports = router;
