/*
 Ruta: /api/tiendas
 */

 const { Router } = require('express');
 const router = Router();
 const {
    getTiendas,
    crearTienda,
    actualizarTienda,
    borrarTienda,
    getTienda,
    find_by_name,
    getTiendasActivos,
    desactivar,
    activar,
    find_by_slug,
    find_by_userid,
 } = require('../controllers/tiendaController');
 
 const { validarJWT } = require('../middlewares/validar-jwt');
 const { check } = require('express-validator');
 const { validarCampos } = require('../middlewares/validar-campos');
 
 router.get('/', getTiendas);
 router.get('/:id', getTienda);
 router.get('/by_user/:userid', find_by_userid);
 router.get('/cat/activas', getTiendasActivos);

 router.get('/by_slug/:slug', find_by_slug);
 router.get('/by_nombre/nombre/:nombre', find_by_name);
 
 router.get('/admin/desactivar/:id', validarJWT, desactivar);
 router.get('/admin/activar/:id', validarJWT, activar);
 
 router.post('/store/', [
     validarJWT,
     check('nombre', 'El nombre del tienda es necesario').not().isEmpty(),
     validarCampos
 ], crearTienda);
 
 router.put('/update/:id', [
    //  validarJWT,
     check('nombre', 'El nombre del tienda es necesario').not().isEmpty(),
     validarCampos
 ], actualizarTienda);
 
 
 
 router.delete('/:id', validarJWT, borrarTienda);
 
 
 
 
 module.exports = router;