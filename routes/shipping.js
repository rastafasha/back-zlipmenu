/*
 Ruta: /api/shippings
 */

const { Router } = require('express');
const router = Router();
const {
    getShippings,
    crearShipping,
    actualizarShipping,
    borrarShipping,
    getShipping,
} = require('../controllers/shippingController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/shippings/:id', getShippings);

router.post('/shipping/registro', [
    check('direccion', 'El direccion es necesario').not().isEmpty(),
    validarCampos
], crearShipping);

router.put('/shipping/update/:id', [
    check('direccion', 'El direccion es necesario').not().isEmpty(),
    validarCampos
], actualizarShipping);

router.delete('/shipping/remove/:id', validarJWT, borrarShipping);

router.get('/shipping/data/:id', getShipping);



module.exports = router;