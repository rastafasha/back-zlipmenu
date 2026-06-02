/*
 Ruta: /api/favoritos
 */

 const { Router } = require('express');
 const router = Router();
 const {
 
    crearFavorito,
    actualizarFavorito,
    getFavoritos,
    getFavorito,
    borrarFavorito,
    listarFavoritoPorUsuario
 } = require('../controllers/favoritoController');
 const { validarJWT } = require('../middlewares/validar-jwt');
 const { validarCampos } = require('../middlewares/validar-campos');
 
 
 router.get('/', getFavoritos);
 router.get('/:id', getFavorito);
 router.get('/user/:id', listarFavoritoPorUsuario);
 
 router.post('/registro', [
     validarJWT,
     validarCampos
 ], crearFavorito);
 
 router.put('/update/:id', [
     validarJWT,
     validarCampos
 ], actualizarFavorito);
 
 router.delete('/remove/:id', validarJWT, borrarFavorito);
 
 
 
 
 
 module.exports = router;