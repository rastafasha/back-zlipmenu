/*
 Ruta: /api/ventas
 */

const { Router } = require('express');
const router = Router();
const {
    getVentas,
    registro,
    actualizarVenta,
    borrarVenta,
    getVenta,
    listarVentaPorUsuario,
    data_detalle,
    finalizar,
    init_data_admin,
    evaluar_cancelacion,
    get_solicitud,
    reembolsar,
    obtener_data_cancelacion,
    evaluar_orden_coment,
    denegar,
    listar_admin,
    set_track,
    update_enviado,
    listar_ventas_dashboard,
    listar_ventas_Year,
    detalles_hoy,
    detalles_hoy_local,
    cancelar,
    listar_cancelaciones,
    listarCancelacionPorUsuario,
    getCancelacion,
    enviarFactura,
    ventasbyTiendaId,
    listar_ventas_Year_local,
    listar_ventas_dashboard_local,
    init_data_admin_local

} = require('../controllers/ventaController');

const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

// importamos multer, agregado por José Prados
const multer = require('multer');
// Configurar Multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//ventas
router.get('/', getVentas);
router.get('/:id', getVenta);

router.post('/store', [
    // validarJWT,
    check('direccion', 'La direccion es necesario').not().isEmpty(),
    validarCampos
], registro);

router.put('/:id', [
    validarJWT,
    check('direccion', 'La direccion es necesario').not().isEmpty(),
    validarCampos
], actualizarVenta);

router.delete('/:id', validarJWT, borrarVenta);

router.get('/user_order/:id', listarVentaPorUsuario);

router.get('/venta_track/detalle/:id', data_detalle);

router.get('/venta_finalizar/venta/:id', finalizar);

router.get('/venta_admin_init/init_data', init_data_admin);
router.get('/venta_admin_init/init_data_local/:localid', init_data_admin_local);

router.get('/evaluar_venta/data/:user/:producto', evaluar_orden_coment);

router.get('/venta_admin/listar/:search/:orden/:tipo', listar_admin);

router.post('/venta_track/set/:id', set_track);

router.get('/venta_enviado/update/:id', update_enviado);

router.get('/venta_data/dashboard', listar_ventas_dashboard);
router.get('/venta_data/dashboard/local/:id', listar_ventas_dashboard_local);

router.get('/venta_data/year/:year', listar_ventas_Year);
router.get('/venta_data/yearlocal/:id/:year', listar_ventas_Year_local);

router.get('/venta_data/detalles/hoy', detalles_hoy);
router.get('/venta_data/detalles/hoy/local/:id', detalles_hoy_local);

router.get('/by_tiendaId/:id', ventasbyTiendaId);



//cancelaciones
router.get('/cancelacion/:id', getCancelacion);

router.get('/user_cancelacion/:id', listarCancelacionPorUsuario);

router.get('/get_cancelacion_admin/data/:wr?', listar_cancelaciones);

router.get('/cancelacion_evaluar/venta/:id', evaluar_cancelacion);

router.post('/cancelacion_send/cancelar', cancelar);



router.get('/get_one_cancelacion_admin/one/:id?', get_solicitud);


router.get('/cancelacion_venta/obtener_data/:id', obtener_data_cancelacion);


router.get('/cancelacion_send/denegar/:id/:idticket', denegar);

router.post('/enviar_factura', upload.single('facturacliente'), enviarFactura);



module.exports = router;