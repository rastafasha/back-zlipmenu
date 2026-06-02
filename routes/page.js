/*
 Ruta: /api/pages
 */

const { Router } = require('express');
const router = Router();
const {
    getPages,
    getPage,
    crearPage,
    actualizarPage,
    borrarPage,
    activar,
    desactivar,
    find_by_slug

} = require('../controllers/pageController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getPages);

router.post('/store', [
    validarJWT,
    check('titulo', 'El nombre es necesario').not().isEmpty(),
    validarCampos
], crearPage);

router.put('/:id', [
    validarJWT,
    check('titulo', 'El nombre es necesario').not().isEmpty(),
    validarCampos
], actualizarPage);

router.get('/by_slug/:slug', find_by_slug);

router.delete('/:id', validarJWT, borrarPage);

router.get('/:id', getPage);
router.get('/page_admin/admin/desactivar/:id', validarJWT, desactivar);
router.get('/page_admin/admin/activar/:id', validarJWT, activar);

module.exports = router;