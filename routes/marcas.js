/*
 Ruta: /api/marcas
 */

const { Router } = require('express');
const router = Router();
const { getMarcas, crearMarca, actualizarMarca, borrarMarca, getMarca } = require('../controllers/marcaController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getMarcas);

router.post('/store', [
    validarJWT,
    check('nombre', 'El nombre del marca es necesario').not().isEmpty(),
    validarCampos
], crearMarca);

router.put('/:id', [
    validarJWT,
    check('nombre', 'El nombre del marca es necesario').not().isEmpty(),
    validarCampos
], actualizarMarca);

router.delete('/:id', validarJWT, borrarMarca);

router.get('/:id', getMarca);


module.exports = router;