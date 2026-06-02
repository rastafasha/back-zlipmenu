/*
 Ruta: /api/pedidomenu
 */

 const { Router } = require('express');
 const router = Router();
 const {
 
    crearPaypal,
    actualizarPaypal,
    getPaypals,
    getPaypalTienda,
    getPaypal,
    borrarPaypal,
 } = require('../controllers/paypalController');
 const { validarJWT } = require('../middlewares/validar-jwt');
 const { validarCampos } = require('../middlewares/validar-campos');
 
 
 router.get('/', getPaypals);
 router.get('/:id', getPaypal);
 router.get('/tienda/:tiendaid', getPaypalTienda);
 
 router.post('/store', [
    //  validarJWT,
     validarCampos
 ], crearPaypal);
 
 router.put('/update/:id', [
     validarCampos
 ], actualizarPaypal);
 
 
 router.delete('/remove/:id',borrarPaypal);
 
 
 
 
 
 module.exports = router;