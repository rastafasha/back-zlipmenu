/*
 Ruta: /api/cursos
 */

const { Router } = require('express');
const router = Router();
const {
    getCursos,
    getCurso,
    crearCurso,
    actualizarCurso,
    borrarCurso,
    // listar_cat,
    desactivar,
    activar,

} = require('../controllers/cursoController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getCursos);
router.get('/:id', getCurso);

router.post('/', [
    validarJWT,
    check('titulo', 'El nombre es necesario').not().isEmpty(),
    validarCampos
], crearCurso);

router.put('/:id', [
    validarJWT,
    check('titulo', 'El nombre es necesario').not().isEmpty(),
    validarCampos
], actualizarCurso);

router.delete('/:id', validarJWT, borrarCurso);



router.get('/curso_admin/admin/desactivar/:id', validarJWT, desactivar);
router.get('/curso_admin/admin/activar/:id', validarJWT, activar);

// router.get('/curso_admin_cat/cat/:filtro?', validarJWT, listar_cat);

module.exports = router;