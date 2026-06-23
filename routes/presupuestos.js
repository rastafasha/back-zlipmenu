/*
 Ruta: /api/presupuestos
 */

const { Router } = require('express');
const router = Router();
const {
    getPresupuestos,
    getPresupuesto,
    crearCotizacionCatering,
    actualizarCotizacionCatering,
    borrarPresupuesto,
    listarPresupuestoPorUsuario,
    listarPresupuestoByLocal,
    updateStatusCotizacionCatering

} = require('../controllers/presupuestoController');
const { validarJWT} = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/:id', getPresupuesto);
router.get('/user/:id', listarPresupuestoPorUsuario);
router.get('/by_tiendaId/:id', listarPresupuestoByLocal);
router.get('/', getPresupuestos);


router.post('/crear', [
    validarJWT,
    validarCampos
], crearCotizacionCatering);

router.put('/editar/:id', [
    validarJWT,
    validarCampos
], actualizarCotizacionCatering);

router.put('/update-status/:id', [
    validarJWT,
    validarCampos
], updateStatusCotizacionCatering);

router.delete('/borrar/:id', validarJWT, borrarPresupuesto);


module.exports = router;