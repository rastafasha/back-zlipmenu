const { Router } = require('express');
const router = Router();

const {getPagosEfectivo, crearPagoEfectivo, byTienda} = require('../controllers/pago-efectivoController');

const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
 
router.get('/', getPagosEfectivo);

router.post('/store', crearPagoEfectivo);
router.get('/tienda/:id', byTienda);

module.exports = router;