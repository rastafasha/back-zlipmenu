/*
 Ruta: /api/productos
 */

const { Router } = require('express');
const router = Router();
const {
    getProductos,
    getProducto,
    crearProducto,
    actualizarProducto,
    borrarProducto,
    find_by_slug,
    find_by_brandig,
    listar_newest,
    listar_best_sellers,
    listar_best_sellers_local,
    listar_populares,
    listar_populares_local,
    cat_by_name,
    // listar,
    listar_papelera,
    listar_cat,
    listar_cat_papelera,
    desactivar,
    activar,
    papelera,
    reducir_stock,
    aumentar_stock,
    aumentar_venta,
    listarAdmin,
    listar_autocomplete,
    listar_general_data,
    list_one,
    listar_productosCateg,
    destacado,
    getProductosActivos,
    listar_productosColor,
    listar_productosCategNombre,
    getProductosTiendaId,
    getProductosTiendaIdActive

} = require('../controllers/productoController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getProductos);
router.get('/activos', getProductosActivos);
router.get('/destacados', destacado);

router.post('/store', [
    validarJWT,
    validarCampos
], crearProducto);

router.put('/update/:id', [
    validarJWT,
    validarCampos
], actualizarProducto);

router.delete('/:id', validarJWT, borrarProducto);

router.get('/:id', getProducto);


router.get('/productos/admin/:filtro?', validarJWT, listarAdmin);
router.get('/producto_admin_editar/one/:id?', list_one);
router.get('/producto_admin/admin/desactivar/:id', validarJWT, desactivar);
router.get('/producto_admin/admin/activar/:id', validarJWT, activar);
router.get('/producto_admin/admin/papelera/:id', validarJWT, papelera);

router.get('/productos/papelera/:search?', validarJWT, listar_papelera);


// router.get('/producto/:filtro?/:min?/:max?/:sub?/:cat?/:orden?/:marca?', validarJWT, listar);

router.get('/producto_by_slug/:slug', find_by_slug);
router.get('/producto_by_branding/:marca', find_by_brandig);
router.get('/producto_by_tiendaId/:id', getProductosTiendaId);
router.get('/by_tiendaId_active/:id', getProductosTiendaIdActive);

router.get('/producto_cliente_autocomplete', validarJWT, listar_autocomplete);

// router.put('/producto/:id/:banner?', path, validarJWT, actualizar);


router.get('/productos_nuevos/show_producto',  listar_newest);
router.get('/productos_stock/reducir/:id/:cantidad', validarJWT, reducir_stock);
router.get('/productos_stock/aumentar/:id/:cantidad', validarJWT, aumentar_stock);


router.get('/productos_ventas/aumentar/:id', validarJWT, aumentar_venta);
router.get('/productos_ventas/best_sellers', 
    // validarJWT, 
    listar_best_sellers);
router.get('/productos_ventas/best_sellers/local/:id', 
    // validarJWT, 
    listar_best_sellers_local);
router.get('/productos_ventas/populares', 
    // validarJWT, 
    listar_populares);
router.get('/productos_ventas/populares/local/:id', 
    // validarJWT, 
    listar_populares_local);

router.get('/producto_general/general/data/:filtro?', listar_general_data);

//categoria
router.get('/productos/cat/papelera/:filtro?', validarJWT, listar_cat_papelera);
router.get('/producto_admin_cat/cat/:filtro?', validarJWT, listar_cat);
router.get('/producto_by_categorynombre/:nombre', cat_by_name);
router.get('/productos_general/destacado/', destacado);

router.get('/productos_general/cat/:id', listar_productosCateg);
router.get('/productos_general/color/:id', listar_productosColor);
router.get('/categoria_nombre/cat/:name', listar_productosCategNombre);






module.exports = router;