/*
 Ruta: /api/color
 */

const { Router } = require('express');
const router = Router();
const {
    getContactos,
    crearContacto,
    borrarContacto,
    getContacto,
    getContactoAtendidos,
    getContactoPendientes,
    atendido,
    desactivar
} = require('../controllers/contactoController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getContactos);
router.get('/:id', validarJWT, getContacto);

router.get('/contacto_admin/pendientes', getContactoPendientes);
router.get('/contacto_admin/atendidos', getContactoAtendidos);

router.post('/', [
    check('nombres', 'El nombres del categoria es necesario').not().isEmpty(),
    validarCampos
], crearContacto);

router.get('/contacto_admin/admin/atendido/:id', validarJWT, atendido);
router.get('/contacto_admin/admin/desactivar/:id', validarJWT, desactivar);

router.delete('/:id', validarJWT, borrarContacto);



module.exports = router;