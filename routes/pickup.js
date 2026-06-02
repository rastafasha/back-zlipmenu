/*
 Ruta: /api/pickups
 */

const { Router } = require('express');
const router = Router();
const {
    getPickups,
    crearPickup,
    actualizarPickup,
    borrarPickup,
    getPickup,
} = require('../controllers/pickupController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/pickups/:id', getPickups);

router.post('/pickup/registro', [
    check('nombreCompleto', 'El nombre es necesario').not().isEmpty(),
    validarCampos
], crearPickup);

router.put('/pickup/update/:id', [
    check('phone', 'El telefono es necesario').not().isEmpty(),
    validarCampos
], actualizarPickup);

router.delete('/pickup/remove/:id', validarJWT, borrarPickup);

router.get('/pickup/data/:id', validarJWT, getPickup);



module.exports = router;