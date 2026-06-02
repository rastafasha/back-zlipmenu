const { response } = require('express');
const Ticket = require('../models/ticket');
var Mensaje = require('../models/mensaje');


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

const send = (req, res) => {
    var data = req.body;

    var mensaje = new Mensaje();
    mensaje.de = data.de;
    mensaje.para = data.para;
    mensaje.msm = data.msm;
    mensaje.ticket = data.ticket;

    if (data.estado == null) {
        console.log('status');
        Ticket.findByIdAndUpdate({ _id: data.ticket }, { status: data.status }, (err, ticket_data) => {
            if (ticket_data) {
                console.log(ticket_data);
                mensaje.save((error, mensaje_data) => {
                    if (!error) {
                        if (mensaje_data) {
                            res.status(200).send({
                                data: mensaje_data,
                            });
                        } else {
                            res.status(200).send({ error: error });
                        }
                    } else {
                        res.status(200).send({ error: error });
                    }
                });
            }
        })
    }
    if (data.estado == 0) {
        Ticket.findByIdAndUpdate({ _id: data.ticket }, { estado: data.estado }, (err, ticket_data) => {
            if (ticket_data) {
                console.log(ticket_data);
                mensaje.save((error, mensaje_data) => {
                    if (!error) {
                        if (mensaje_data) {
                            res.status(200).send({
                                data: mensaje_data,
                            });
                        } else {
                            res.status(200).send({ error: error });
                        }
                    } else {
                        res.status(200).send({ error: error });
                    }
                });
            }
        })
    }


}

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