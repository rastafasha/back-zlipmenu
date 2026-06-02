/*
 Ruta: /api/notificaciones
 */

const { Router } = require('express');
const { validarJWT } = require('../middlewares/validar-jwt');
const { 
    obtenerHistorial,
    obtenerContador,
    marcarTodasLeidas,
    marcarUnaLeida
} = require('../controllers/notificacionesController');

const router = Router();

// Todas las rutas de notificaciones de Juan, Ana o Carlos requieren Token
router.use(validarJWT);

router.get('/historial', obtenerHistorial);
router.get('/unread-count', obtenerContador);
router.put('/marcar-leidas', marcarTodasLeidas);
router.put('/:id', marcarUnaLeida); // <--- Esta es la del Offcanvas

module.exports = router;
