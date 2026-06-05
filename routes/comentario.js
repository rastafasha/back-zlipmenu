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
    listarDislikes,
    getComentarioProducto
} = require('../controllers/comentarioController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getComentarios);

router.get('/:id', validarJWT, getComentario);
router.get('/producto/:id',  getComentarioProducto);
router.get('/comentarios_client/obtener/:id/:orden', getData);
router.get('/comentarios_likes/get/:id', listarLikes);
router.get('/comentarios_dislikes/get/:id', listarDislikes);


router.post('/comentarios_likes/add', addLike);

router.post('/comentarios_dislikes/add', addDislike);
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





module.exports = router;