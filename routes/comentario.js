/*
 Ruta: /api/comentario
 */

const { Router } = require('express');
const router = Router();
const {
    getComentarios,
    crearComentario,
    actualizarComentario,
    borrarComentario,
    getComentario,
    listarLast,
    listarLikes,
    addDislike,
    addLike,
    getData,
    listarDislikes
} = require('../controllers/comentarioController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getComentarios);

router.post('/', [
    validarJWT,
    check('comentario', 'El comentario del categoria es necesario').not().isEmpty(),
    validarCampos
], crearComentario);

router.put('/:id', [
    validarJWT,
    check('comentario', 'El comentario del categoria es necesario').not().isEmpty(),
    validarCampos
], actualizarComentario);

router.delete('/:id', validarJWT, borrarComentario);

router.get('/:id', validarJWT, getComentario);

router.get('/comentarios_client/obtener/:id/:orden', getData);

router.post('/comentarios_likes/add', addLike);
router.get('/comentarios_likes/get/:id', listarLikes);

router.post('/comentarios_dislikes/add', addDislike);
router.get('/comentarios_dislikes/get/:id', listarDislikes);


module.exports = router;