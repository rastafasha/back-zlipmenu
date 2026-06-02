/*
 Ruta: /api/tipopago
 */

const { Router } = require('express');
const router = Router();
const {
    getPaymentMethods,
    crearPaymentMethod,
    actualizarPaymentMethod,
    borrarPaymentMethod,
    getPaymentMethod,
    listarPorUsuario,
    updateStatus,
    getPaymentMethodName,
    listar_active,
    tiposbyTienda
} = require('../controllers/tipopagoController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getPaymentMethods);
router.get('/actives', listar_active);
router.get('/:id', getPaymentMethod);
router.get('/user/:id', listarPorUsuario);
 router.get('/tienda/:id', tiposbyTienda);
router.get('/name/:tipo', getPaymentMethodName);

router.post('/store', [
    validarJWT,
    validarCampos
], crearPaymentMethod);

router.put('/update/:id', [
    validarJWT,
    validarCampos
], actualizarPaymentMethod);

router.delete('/remove/:id', borrarPaymentMethod);


router.put('/statusupdate/:id', updateStatus);
 

module.exports = router;