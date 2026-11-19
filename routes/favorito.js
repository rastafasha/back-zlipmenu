/*
 Ruta: /api/favoritos
 */

 const { Router } = require('express');
 const router = Router();
 const {
 
    crearFavorito,
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
 
 
 router.delete('/remove/:id', validarJWT, borrarFavorito);
 
 
 
 
 
 module.exports = router;