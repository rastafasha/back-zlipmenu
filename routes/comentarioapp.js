/*
 Ruta: /api/comentarioapp
 */

const { Router } = require('express');
const router = Router();
const {
    getComentarios,
    crearComentario,
    actualizarComentario,
    borrarComentario,
    getComentario,
    getComentarioTienda
} = require('../controllers/comentarioappController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getComentarios);

router.post('/store', [
    // validarJWT,
    validarCampos
], crearComentario);

router.put('/update/:id', [
    validarJWT,
    validarCampos
], actualizarComentario);

router.delete('/remove/:id', validarJWT, borrarComentario);

router.get('/:id', validarJWT, getComentario);
router.get('/tienda/:tiendaid', validarJWT, getComentarioTienda);



module.exports = router;