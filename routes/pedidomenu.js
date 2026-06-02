/*
 Ruta: /api/pedidomenu
 */

 const { Router } = require('express');
 const router = Router();
 const {
 
    crearPedidoMenu,
    actualizarPedidoMenu,
    getPedidoMenus,
    getPedidoMenusTienda,
    getPedidoMenu,
    borrarPedidoMenu,
    listarPedidoPorUser,
    getPedidosByStatus,
    activar,
    finalizado,
    pedidosbyTiendaId,
    pedidosbyTiendaIdUser,
 } = require('../controllers/pedidoMenuController');
 const { validarJWT } = require('../middlewares/validar-jwt');
 const { validarCampos } = require('../middlewares/validar-campos');
 
 
 router.get('/', getPedidoMenus);
 router.get('/:id', getPedidoMenu);
 router.get('/user/:id', listarPedidoPorUser);
 router.get('/tienda/:tiendaid', getPedidoMenusTienda);
 router.get('/status/:status', getPedidosByStatus);
 router.get('/by_tiendaId/:id', pedidosbyTiendaId);
 router.get('/by_tiendaiduser/:tiendaid/:userid',pedidosbyTiendaIdUser);
 
 router.post('/store', [
    //  validarJWT,
     validarCampos
 ], crearPedidoMenu);
 
 router.put('/update/:id', [
     validarCampos
 ], actualizarPedidoMenu);
 

 router.put('/activar/:id', validarJWT, activar);
 router.put('/finalizado/:id', validarJWT, finalizado);
 
 router.delete('/remove/:id', 
    
    borrarPedidoMenu);
 
 
 
 
 
 module.exports = router;