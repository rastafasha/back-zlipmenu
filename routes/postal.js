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
    obtenerPostalesPorLocal
} = require('../controllers/postalController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getPostals);
router.get('/:id', getPostal);
router.get('/local/:localId', obtenerPostalesPorLocal);

router.post('/', [
    validarJWT,
    validarCampos
], crearPostal);

router.put('/actualizar/:id', [
    validarJWT,
    validarCampos
], actualizarPostal);

router.delete('/:id', validarJWT, borrarPostal);







module.exports = router;