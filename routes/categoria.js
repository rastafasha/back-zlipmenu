/*
 Ruta: /api/categorias
 */

const { Router } = require('express');
const router = Router();
const {
    getCategorias,
    crearCategoria,
    actualizarCategoria,
    borrarCategoria,
    getCategoria,
    get_car_slide,
    list_one,
    find_by_name,
    find_by_subcategory,
    getCategoriasActivos,
    desactivar,
    activar,
    getCategoriasByLocal
} = require('../controllers/categoriaController');

const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getCategorias);
router.get('/:id', getCategoria);
router.get('/cat/activas', getCategoriasActivos);

router.get('/slider', get_car_slide);

router.get('/one/:id?', list_one);

router.get('/category_by_nombre/nombre/:nombre', find_by_name);
router.get('/category_by_subcategoria/:id', find_by_subcategory);
// El parámetro DEBE llamarse ":localId"
router.get('/local/:localId', getCategoriasByLocal);


router.get('/admin/desactivar/:id', validarJWT, desactivar);
router.get('/admin/activar/:id', validarJWT, activar);

router.post('/', [
    validarJWT,
    check('nombre', 'El nombre del categoria es necesario').not().isEmpty(),
    validarCampos
], crearCategoria);

router.put('/:id', [
    validarJWT,
    check('nombre', 'El nombre del categoria es necesario').not().isEmpty(),
    validarCampos
], actualizarCategoria);



router.delete('/:id', validarJWT, borrarCategoria);




module.exports = router;