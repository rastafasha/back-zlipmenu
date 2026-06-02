/*
 Ruta: /api/sliders
 */

const { Router } = require('express');
const router = Router();
const {
    getSliders,
    crearSlider,
    actualizarSlider,
    borrarSlider,
    getSlider,
    activar,
    desactivar,
    listar_active
} = require('../controllers/sliderController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getSliders);
router.get('/actives', listar_active);

router.post('/', [
    validarJWT,
    // check('img', 'La imagen es necesario').not().isEmpty(),
    validarCampos
], crearSlider);

router.put('/:id', [
    validarJWT,
    validarCampos
], actualizarSlider);

router.delete('/:id', validarJWT, borrarSlider);

router.get('/:id', getSlider);

router.get('/slider_admin/admin/desactivar/:id', validarJWT, desactivar);
router.get('/slider_admin/admin/activar/:id', validarJWT, activar);


module.exports = router;