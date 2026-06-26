const { response } = require('express');
const Ticket = require('../models/ticket');
var Mensaje = require('../models/mensaje');
const Notificacion = require('../models/notificacion');
const PushSubscription = require('../models/push-subscription');
const { sendNotification } = require('../helpers/notificaciones');


const getTickets = async(req, res) => {

    const tickets = await Ticket.find().populate('tema status estado user');

    res.json({
        ok: true,
        tickets
    });
};

const getTicket = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Ticket.findById(id)
        .exec((err, ticket) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar Ticket',
                    errors: err
                });
            }
            if (!ticket) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El Ticket con el id ' + id + 'no existe',
                    errors: { message: 'No existe un Ticket con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                ticket: ticket
            });
        });
};

const listarTicketPorVenta = (req, res) => {
    var id = req.params['id'];
    Ticket.find({ venta: id }, (err, data_ticket) => {
        if (!err) {
            if (data_ticket) {
                res.status(200).send({ tickets: data_ticket });
            } else {
                res.status(500).send({ error: err });
            }
        } else {
            res.status(500).send({ error: err });
        }
    });

    
}

const crearTicket = async(req, res) => {

    const uid = req.uid;
    const ticket = new Ticket({
        usuario: uid,
        ...req.body
    });

    try {

        const ticketDB = await ticket.save();

        res.json({
            ok: true,
            ticket: ticketDB
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }


};

const actualizarTicket = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const ticket = await Ticket.findById(id);
        if (!ticket) {
            return res.status(500).json({
                ok: false,
                msg: 'Ticket no encontrado por el id'
            });
        }

        const cambiosTicket = {
            ...req.body,
            usuario: uid
        }

        const ticketActualizado = await Ticket.findByIdAndUpdate(id, cambiosTicket, { new: true });

        res.json({
            ok: true,
            ticketActualizado
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};

const borrarTicket = async(req, res) => {

    const id = req.params.id;

    try {

        const ticket = await Ticket.findById(id);
        if (!ticket) {
            return res.status(500).json({
                ok: false,
                msg: 'Ticket no encontrado por el id'
            });
        }

        await Ticket.findByIdAndDelete(id);
        // Eliminamos todos los mensajes asociados al ticket
        await Mensaje.deleteMany({ ticket: id });

        res.json({
            ok: true,
            msg: 'Ticket eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};

const send = async (req, res) => {
    const data = req.body;

    try {
        // 1. Crear e inicializar el nuevo mensaje con la data del front
        const nuevoMensaje = new Mensaje({
            de: data.de,
            para: data.para,
            msm: data.msm,
            ticket: data.ticket
        });

        // 2. Determinar dinámicamente qué campos del Ticket actualizar
        let camposUpdate = {};
        
        if (data.estado === null || data.estado === undefined) {
            // Si no viene estado, actualizamos el campo 'status' (Ej: 'Entregado', 'Abierto')
            camposUpdate.status = data.status;
        } else if (data.estado == 0) {
            // Si el estado es expresamente 0, actualizamos la columna 'estado'
            camposUpdate.estado = data.estado;
        }

        // 3. Actualizar el ticket solo si determinamos que hay cambios por aplicar
        if (Object.keys(camposUpdate).length > 0) {
            const ticketActualizado = await Ticket.findByIdAndUpdate(data.ticket, camposUpdate, { new: true });
            if (!ticketActualizado) {
                console.warn(`Advertencia: No se encontró el ticket con ID ${data.ticket} para actualizar.`);
            }
        }

        // 4. Guardar de forma segura el mensaje de chat en MongoDB
        const mensajeGuardado = await nuevoMensaje.save();

        // 5. DISPARAR NOTIFICACIÓN EN TIEMPO REAL AL RECEPTOR ('para')
        try {
            // Buscamos si la persona que debe recibir el mensaje tiene suscripciones Push activas
            const suscripciones = await PushSubscription.find({ usuario: data.para });

            if (suscripciones && suscripciones.length > 0) {
                const payload = JSON.stringify({
                    notification: {
                        title: 'Nuevo mensaje de chat 💬',
                        body: data.msm.length > 50 ? `${data.msm.substring(0, 50)}...` : data.msm,
                        icon: '/assets/icon-96x96.png',
                        vibrate:[100, 50, 100,],
                        data: { url: `/tickets/${data.ticket}` }
                    }
                });

                // Enviamos las push en paralelo sin bloquear la respuesta de la API
                const promesas = suscripciones.map(sub => 
                    sendNotification({
                        endpoint: sub.endpoint,
                        keys: { auth: sub.keys.auth, p256dh: sub.keys.p256dh }
                    }, payload).catch(e => console.error('Error enviando a un dispositivo individual:', e))
                );
                await Promise.all(promesas);
            }

            // También guardamos el registro en tu base de datos bajo tu modelo 'Notificacion'
            const alertaHistorial = new Notificacion({
                usuario: data.para,
                titulo: 'Nuevo mensaje en el ticket',
                mensaje: data.msm,
                tipo: 'NUEVO_MENSAJE', // Sincronizado perfectamente con tu ENUM de Mongoose
                referenciaId: data.ticket,
                leido: false
            });
            await alertaHistorial.save();

        } catch (pushError) {
            // Si las notificaciones fallan por problemas de internet o tokens vencidos,
            // atrapamos el error aquí para que NO interfiera con la entrega del mensaje de chat
            console.error('Error secundario al procesar las notificaciones push:', pushError);
        }

        // 6. ENVIAR RESPUESTA EXITOSA ÚNICA AL FRONTEND DE ANGULAR
        return res.status(200).json({
            ok: true,
            data: mensajeGuardado
        });

    } catch (error) {
        console.error('Error crítico en el controlador de mensajes (send):', error);
        if (!res.headersSent) {
            return res.status(500).json({
                ok: false,
                error: 'Error interno en el servidor al enviar el mensaje.'
            });
        }
    }
};

const dataMessenger = (req, res) => {

    var de = req.params['de'];
    var para = req.params['para'];


    const data = {
        '$or': [{
            '$and': [{
                'para': de
            }, {
                'de': para
            }]
        }, {
            '$and': [{
                'para': para
            }, {
                'de': de
            }]
        }, ]
    };


    Mensaje.find(data).sort({ createdAt: 1 }).exec(function(err, messages) {
        if (messages) {
            res.status(200).send({ mensajes: messages });
        } else {
            res.status(200).send({ error: "No hay ningun mensaje" });
        }
    });
}



function listar_tickets(req, res) {
    var id = req.params['id'];
    Mensaje.find({ ticket: id }).sort({ createdAt: 1 }).exec((err, data_mansajes) => {
        if (err) {
            res.status(500).send({ error: err });
        } else {
            if (data_mansajes) {
                res.status(200).send({ mensajes: data_mansajes });
            }
        }
    });
}

function listar_todos(req, res) {
    var status = req.params['status'];
    var estado = req.params['estado'];


    var miFechaActual = new Date();
    console.log('dia ' + miFechaActual.getDate());

    if (status == 'null' && estado == 'null') {
        console.log('1');
        Ticket.find().sort({ createdAt: -1 }).populate('user').exec((err, data_tickets) => {
            if (err) {
                res.status(500).send({ error: err });
            } else {
                if (data_tickets) {
                    res.status(200).send({ tickets: data_tickets });
                }
            }
        });
    } else if (status && estado) {
        console.log('2');
        Ticket.find({ status: status, estado: estado }).sort({ createdAt: -1 }).populate('user').exec((err, data_tickets) => {
            if (err) {
                res.status(500).send({ error: err });
            } else {
                if (data_tickets) {
                    res.status(200).send({ tickets: data_tickets });
                }
            }
        });
    }

}





module.exports = {
    getTickets,
    crearTicket,
    actualizarTicket,
    borrarTicket,
    getTicket,
    dataMessenger,
    send,
    listarTicketPorVenta,
    listar_tickets,
    listar_todos
};