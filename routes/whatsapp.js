/*
 Ruta: /api/whatsapp
 */

 const { Router } = require('express');
 const router = Router();
 const {
 sincronizarCatalogoWhatsApp
 } = require('../controllers/whatsappController');
 const { validarJWT } = require('../middlewares/validar-jwt');
 const { validarCampos } = require('../middlewares/validar-campos');
 
 
 router.post('/sincronizar-catalogo', [
     validarJWT,
     validarCampos
 ], sincronizarCatalogoWhatsApp);
 
 module.exports = router;