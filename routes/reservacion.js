/*
 Ruta: /api/reservacion
 */

 const { Router } = require('express');
 const router = Router();
 const {
    getReservaciones,
    crearReservacion,
    actualizarReservacion,
    borrarReservacion,
    getReservacion,
    find_Reservacionesby_userid,
    getReservacionesByLocal,
 } = require('../controllers/reservacionController');
 
 const { validarJWT } = require('../middlewares/validar-jwt');
 const { check } = require('express-validator');
 const { validarCampos } = require('../middlewares/validar-campos');
 
 router.get('/', getReservaciones);
 router.get('/:id', getReservacion);
 router.get('/by_user/:userid', find_Reservacionesby_userid);
 router.get('/local/:localId', getReservacionesByLocal);

 router.post('/store/', [
     validarJWT,
     validarCampos
 ], crearReservacion);

 
 router.put('/update/:id', [
     validarCampos
 ], actualizarReservacion);
 
 router.delete('/delete/:id', validarJWT, borrarReservacion);
 
 module.exports = router;