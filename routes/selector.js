/*
 Ruta: /api/selector
 */

const { Router } = require('express');
const router = Router();
const {
    getSelectors,
    getSelector,
    crearSelector,
    actualizarSelector,
    borrarSelector,
    findByProduct
} = require('../controllers/selectorController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/all', getSelectors);

router.post('/', [
    validarJWT,
    check('titulo', 'El titulo del categoria es necesario').not().isEmpty(),
    validarCampos
], crearSelector);

router.put('/:id', [
    validarJWT,
    check('titulo', 'El titulo del categoria es necesario').not().isEmpty(),
    validarCampos
], actualizarSelector);

router.delete('/:id', validarJWT, borrarSelector);

router.get('/:id', validarJWT, getSelector);

router.get('/selector_producto/find/:id?', findByProduct);


module.exports = router;