/*
 Ruta: /api/tiendas
 */

const { Router } = require('express');
const router = Router();
const {
    getTiendas,
    crearTienda,
    actualizarTienda,
    borrarTienda,
    getTienda,
    find_by_name,
    getTiendasActivos,
    desactivar,
    activar,
    find_by_slug,
    find_by_userid,
} = require('../controllers/tiendaController');

const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { crearClienteWhatsApp } = require('../helpers/whatsapp-helper');
const Tienda = require('../models/tienda');

router.get('/', getTiendas);
router.get('/:id', getTienda);
router.get('/by_user/:userid', find_by_userid);
router.get('/cat/activas', getTiendasActivos);
router.get('/by_slug/:slug', find_by_slug);
router.get('/by_nombre/nombre/:nombre', find_by_name);
router.get('/admin/desactivar/:id', validarJWT, desactivar);
router.get('/admin/activar/:id', validarJWT, activar);



router.post('/store/', [
    validarJWT,
    check('nombre', 'El nombre del tienda es necesario').not().isEmpty(),
    validarCampos
], crearTienda);


router.put('/update/:id', [
     validarJWT,
    check('nombre', 'El nombre del tienda es necesario').not().isEmpty(),
    validarCampos
], actualizarTienda);



router.delete('/delete/:id', validarJWT, borrarTienda);


// 1. El endpoint para CONECTAR (POST)
router.post('/whatsapp/conectar/:id', async (req, res) => {
    try {
        const localId = req.params.id; 

        // Arrancamos el proceso dinámico
        crearClienteWhatsApp(localId);

        // En vez de consultar a la DB apurados, le respondemos a Angular de una vez
        // que el bot se está inicializando y que active su bucle de escucha
        return res.status(200).json({
            _id: localId,
            whatsappStatus: 'ESPERANDO_QR', // Forzamos esto para activar el Angular
            whatsappQR: '' // Llega vacío pero el bucle lo buscará en 5 segundos
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


// 2. El endpoint para el STATUS (GET)
router.get('/whatsapp-status/:id', async (req, res) => {
    try {
        const tienda = await Tienda.findById(req.params.id).select('whatsappStatus whatsappQR');
        return res.status(200).json(tienda);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});







module.exports = router;