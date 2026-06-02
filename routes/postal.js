/*
 Ruta: /api/postals
 */

const { Router } = require('express');
const router = Router();
const {
    getPostals,
    crearPostal,
    actualizarPostal,
    borrarPostal,
    getPostal,
} = require('../controllers/postalController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getPostals);

router.post('/', [
    validarJWT,
    validarCampos
], crearPostal);

router.put('/:id', [
    validarJWT,
    validarCampos
], actualizarPostal);

router.delete('/:id', validarJWT, borrarPostal);

router.get('/:id', getPostal);





module.exports = router;