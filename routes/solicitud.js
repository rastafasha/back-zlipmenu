/*
 Ruta: /api/solicitudes
 */

const { Router } = require('express');
const router = Router();
const {
    getSolicitudes,
    getSolicitud,
    crearSolicitud,
    actualizarSolicitud,
    borrarSolicitud,
    listarSolicitudPorUsuario,
    updateStatusSolicitud,
    listarSolicitudoByLocal

} = require('../controllers/solicitudPedidoController');
const { validarJWT} = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/:id', getSolicitud);
router.get('/user/:id', listarSolicitudPorUsuario);
router.get('/by_tiendaId/:id', listarSolicitudoByLocal);
router.get('/', getSolicitudes);


router.post('/crear', [
    // validarJWT,
    validarCampos
], crearSolicitud);

router.put('/editar/:id', [
    validarJWT,
    validarCampos
], actualizarSolicitud);

router.put('/update-status/:id', [
    validarJWT,
    validarCampos
], updateStatusSolicitud);

router.delete('/borrar/:id', validarJWT, borrarSolicitud);


module.exports = router;