/*
 Ruta: /api/videocursos
 */

 const { Router } = require('express');
 const router = Router();
 const {
    getVideocursos,
    getVideocurso,
    crearVideocurso,
    actualizarVideocurso,
    borrarVideocurso,
    desactivar,
    activar,
    findByCurso
 
 } = require('../controllers/videocursoController');
 const { validarJWT } = require('../middlewares/validar-jwt');
 const { check } = require('express-validator');
 const { validarCampos } = require('../middlewares/validar-campos');
 
 router.get('/', getVideocursos);
 router.get('/:id', getVideocurso);
 router.get('/bycurso/:id', findByCurso);
 
 router.post('/crear', [
     validarJWT,
    //  check('titulo', 'El nombre es necesario').not().isEmpty(),
     validarCampos
 ], crearVideocurso);
 
 router.put('/update/:id', [
     validarJWT,
    //  check('titulo', 'El nombre es necesario').not().isEmpty(),
     validarCampos
 ], actualizarVideocurso);
 
 router.delete('/borrar/:id', validarJWT, borrarVideocurso);
 
 
 router.get('/desactivar/:id', validarJWT, desactivar);
 router.get('/activar/:id', validarJWT, activar);
 
 // router.get('/curso_admin_cat/cat/:filtro?', validarJWT, listar_cat);
 
 module.exports = router;