const { Router } = require('express');
const router = Router();

const {getPagosCheque, crearPagoCheque, updateStatus} = require('../controllers/pagoChequeController');

const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
 
router.get('/', getPagosCheque);

router.post('/store', crearPagoCheque);
router.put('/statusupdate/:id', updateStatus);
 

module.exports = router;