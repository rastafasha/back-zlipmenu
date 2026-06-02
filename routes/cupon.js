/*
 Ruta: /api/cupon
 */

const { Router } = require('express');
const router = Router();
const {
    getCupons,
    crearCupon,
    actualizarCupon,
    borrarCupon,
    getCuponbyId,
    getCuponbyCode,
} = require('../controllers/cuponController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getCupons);
router.get('/:id', validarJWT, getCuponbyId);
router.get('/codigo/:codigo', validarJWT, getCuponbyCode);

router.post('/', [
    validarJWT,
    check('tipo', 'El tipo del categoria es necesario').not().isEmpty(),
    validarCampos
], crearCupon);

router.put('/:id', [
    validarJWT,
    check('tipo', 'El tipo del categoria es necesario').not().isEmpty(),
    validarCampos
], actualizarCupon);

router.delete('/:id', validarJWT, borrarCupon);





module.exports = router;