/*
 Ruta: /api/carritos
 */

const { Router } = require('express');
const router = Router();
const {
    getCarritos,
    crearCarrito,
    actualizarCarrito,
    previewCarrito,
    removeCarrito,
    listarPorUsuario

} = require('../controllers/carritoController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getCarritos);
router.get('/carritouser/:id', listarPorUsuario);

router.post('/', [
    validarJWT,
    check('cantidad', 'El cantidad del carrito es necesario').not().isEmpty(),
    validarCampos
], crearCarrito);

router.put('/:id', [
    validarJWT,
    check('cantidad', 'El cantidad del carrito es necesario').not().isEmpty(),
    validarCampos
], actualizarCarrito);


router.get('/limit/data/:id', previewCarrito);
router.delete('/delete/:id', removeCarrito);


module.exports = router;