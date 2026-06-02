/*
 Ruta: /api/asignardelivery
 */

 const { Router } = require('express');
 const router = Router();
 const {
 
    crearAsignacion,
    actualizarAsignacion,
    getAsignacions,
    getAsignacionsTienda,
    getAsignacion,
    borrarAsignacion,
    listarAsignacionPorDriver,
    listarAsignacionPorUser,
    actualizarAsignacionCoord,
    activar,
    entregado,
    recibido,
    getAsignacionsByStatus,
 } = require('../controllers/asignacionController');
 const { validarJWT } = require('../middlewares/validar-jwt');
 const { validarCampos } = require('../middlewares/validar-campos');
 
 
 router.get('/', getAsignacions);
 router.get('/:id', getAsignacion);
 router.get('/driver/:id', listarAsignacionPorDriver);
 router.get('/user/:id', listarAsignacionPorUser);
 router.get('/tienda/:tiendaid', getAsignacionsTienda);

 router.get('/activar/:id',  activar);
 router.get('/entregado/:id',  entregado);
 router.get('/recibido/:id',  recibido);
 router.get('/status/:id/:status',  getAsignacionsByStatus);

 router.post('/store', [
     validarJWT,
     validarCampos
 ], crearAsignacion);
 
 router.put('/update/:id', [
     validarJWT,
     validarCampos
 ], actualizarAsignacion);

 router.put('/update/coord/:id', [
     validarCampos
 ], actualizarAsignacionCoord);
 
 router.delete('/remove/:id', validarJWT, borrarAsignacion);
 
 
 
 
 
 module.exports = router;