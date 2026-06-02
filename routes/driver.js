/*
 Ruta: /api/driver
 */

 const { Router } = require('express');
 const router = Router();
 const {
 
     crearDriver,
    actualizarDriver,
    getDrivers,
    getDriver,
    borrarDriver,
    listarDriverPorUsuario,
    listarDriverPorLocal
 } = require('../controllers/driverpController');
 const { validarJWT } = require('../middlewares/validar-jwt');
 const { validarCampos } = require('../middlewares/validar-campos');
 
 
 router.get('/', getDrivers);
 router.get('/:id', getDriver);
 router.get('/user/:userId', listarDriverPorUsuario);
 router.get('/tienda/:local', listarDriverPorLocal);
 
 router.post('/store', [
     validarJWT,
     validarCampos
 ], crearDriver);
 
 router.put('/update/:id', [
     validarJWT,
     validarCampos
 ], actualizarDriver);
 
 router.delete('/remove/:id', validarJWT, borrarDriver);
 
 
 
 
 
 module.exports = router;