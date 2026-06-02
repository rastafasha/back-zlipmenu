/*
 Ruta: /api/tickets
 */

const { Router } = require('express');
const router = Router();
const {
    getTickets,
    crearTicket,
    actualizarTicket,
    borrarTicket,
    getTicket,
    dataMessenger,
    send,
    listarTicketPorVenta,
    listar_tickets,
    listar_todos,
    dataMensajes
} = require('../controllers/ticketController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getTickets);

router.get('/ticket_venta/:id', listarTicketPorVenta);

router.post('/', [
    validarJWT,
    check('tema', 'El tema del ticket es necesario').not().isEmpty(),
    validarCampos
], crearTicket);

router.put('/:id', [
    validarJWT,
    check('tema', 'El tema del ticket es necesario').not().isEmpty(),
    validarCampos
], actualizarTicket);

router.delete('/delete/:id', validarJWT, borrarTicket);

router.get('/:id', getTicket);

router.get('/ticket_data/one/:id', getTicket);

router.post('/ticket_msm/send', send);
router.get('/ticket_chat/chat/:de/:para', dataMessenger);
router.get('/ticket_listar/listar/:id', listar_tickets);
router.get('/ticket_admin/all/:status?/:estado?', listar_todos);



module.exports = router;