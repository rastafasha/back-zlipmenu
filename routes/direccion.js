/*
 Ruta: /api/direccions
 */

const { Router } = require('express');
const router = Router();
const {

    crearDireccion,
    actualizarDireccion,
    borrarDireccion,
    getDireccion,
    getDireccions,
    listarPorUsuario
} = require('../controllers/direccionController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');


router.get('/', getDireccions);
router.get('/direccionesusuario/:id', listarPorUsuario);
router.get('/direccion/:id', getDireccion);

router.post('/direccion/registro', [
    validarJWT,
    check('direccion', 'El direccion es necesario').not().isEmpty(),
    validarCampos
], crearDireccion);

router.put('/direccion/update/:id', [
    validarJWT,
    check('direccion', 'El direccion es necesario').not().isEmpty(),
    validarCampos
], actualizarDireccion);

router.delete('/direccion/remove/:id', borrarDireccion);





module.exports = router;