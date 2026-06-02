const { response } = require('express');
const mongoose = require('mongoose');
const Tienda = require('../models/tienda');
const Usuario = require('../models/usuario');
const Pedido = require('../models/pedidomenu');
const PushSubscription = require('../models/push-subscription');
const { sendNotification } = require('../helpers/notificaciones');

const crearPedidoMenu = async(req, res) => {
    const { user, pedidoList, tienda } = req.body;

    const body = req.body;
    try {

        const existeUsuario = await Usuario.findById(body.user);
       
        const existeTienda = await Tienda.findById(body.tienda);

        if (!existeUsuario) {
            return res.status(400).json({
                ok: false,
                 msg: 'El usuario no existe'
            })
        }
        if (!existeTienda) {
            return res.status(400).json({
                ok: false,
                msg: 'La tienda no existe'
            });
        }

        
        const pedido = new Pedido({
            user: body.user,
            pedidoList: body.pedidoList,
            tienda: body.tienda,
            delivery: body.delivery,
            deliveryAddres: body.deliveryAddres,
            status: body.status,
        });

        //guardar pedido
        await pedido.save();

        res.json({
            ok: true,
            pedido
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado... revisar logs'
        });
    }


};
        

const actualizarPedidoMenu = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const pedido = await Pedido.findById(id);
        if (!pedido) {
            return res.status(500).json({
                ok: false,
                msg: 'pedido no encontrado por el id'
            });
        }
        const usuario = await Usuario.findById(req.body.user);
        if (!usuario) {
            return res.status(500).json({
                ok: false,
                msg: 'usuario no encontrado por el id'
            });
        }

        const cambiosPedido = {
            ...req.body,
            usuario: uid
        }

        const pedidoActualizado = await Pedido.findByIdAndUpdate(id, cambiosPedido, { new: true });

        res.json({
            ok: true,
            pedidoActualizado
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};

const getPedidoMenus = async(req, res) => {

    const pedidos = await Pedido.find()
        .populate('user', 'nombre email')
        .populate('tienda', 'nombre direccion');
    res.json({
        ok: true,
        pedidos
    });
};
const getPedidoMenusTienda = async(req, res) => {

    const pedidos = await Pedido.find().populate('tienda')
    .populate('driver');

      
    const tiendaid = req.params.tiendaid;
    const tienda = await Tienda.findById(tiendaid);

    const pedidosTienda = pedidos.filter(pedido => pedido.tienda.toString() === tiendaid)
    ;  


    res.json({
        ok: true,
        // pedidosTienda,
        pedidos,
    });
};

const getPedidoMenu = async(req, res) => {

    const id = req.params.id;

    Pedido.findById(id)
        .populate('user', 'nombre email')
        .populate('tienda', 'nombre direccion')
        .exec((err, pedido) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar pedido',
                    errors: err
                });
            }
            if (!pedido) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El pedido con el id ' + id + 'no existe',
                    errors: { message: 'No existe un pedido con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                pedido: pedido
            });
        });

};


const borrarPedidoMenu = async(req, res) => {

    const id = req.params.id;

    try {

        const pedido = await Pedido.findById(id);
        if (!pedido) {
            return res.status(500).json({
                ok: false,
                msg: 'pedido no encontrado por el id'
            });
        }

        await Pedido.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'pedido eliminado'
        });

    } catch (error) {
        console.log(error)
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};

const listarPedidoPorUser = (req, res) => {
    var id = req.params['id'];
    Pedido.find({ user: id }, (err, data_pedido) => {
        if (!err) {
            if (data_pedido) {
                res.status(200).send({ pedidos: data_pedido });
            } else {
                res.status(500).send({ error: err });
            }
        } else {
            res.status(500).send({ error: err });
        }
    })
    .sort({createdAt: - 1});
}

const getPedidosByStatus = async(req, res) => {

    var status = req.params['status'];
    Pedido.find({ status: status })
        .populate('tienda', 'nombre')
        .populate('user', 'telefono numdoc first_name last_name')
        .sort({createdAt: - 1})
        .exec((err, data_pedido) => {
            if (!err) {
                if (data_pedido) {
                    res.status(200).send({ pedidos: data_pedido });
                } else {
                    res.status(500).send({ error: err });
                }
            } else {
                res.status(500).send({ error: err });
            }
        });
};

async function activar(req, res) {
    const id = req.params['id'];

    try {
        // 1. Actualizamos el pedido. { new: true } nos devuelve el pedido YA modificado.
        const pedido_data = await Pedido.findByIdAndUpdate(
            { _id: id }, 
            { status: 'INPROCESS' }, 
            { new: true }
        );

        if (!pedido_data) {
            return res.status(403).send({ message: 'No se actualizó el pedido, vuelva a intentar nuevamente.' });
        }

        // 🚀 DISPARO CENTRALIZADO DE NOTIFICACIÓN HÍBRIDA
        // Definimos textos atractivos para el cliente de Zlipmenu
        const tipoNotificacion = 'PEDIDO_APROBADO'; 
        const titulo = '¡Tu pedido está en proceso! 🍳';
        const mensaje = `El comercio ha aceptado tu orden y ya la está preparando.`;
        
        // El cliente que realizó la compra
        const clienteId = pedido_data.user || pedido_data.cliente; 
        const urlRedireccion = `/my-account/pedidos/${pedido_data._id}`;

        // Buscamos si el cliente tiene dispositivos con Web Push activos
        const subs = await PushSubscription.find({ user: clienteId });

        if (subs.length > 0) {
            // Caso A: Dispositivos compatibles registrados
            for (const sub of subs) {
                try {
                    await sendNotification(sub, titulo, mensaje, urlRedireccion, clienteId, tipoNotificacion, pedido_data._id);
                } catch (pushErr) {
                    // Limpieza automática si el token del navegador expiró (410/404)
                    if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                        await PushSubscription.findByIdAndDelete(sub._id);
                        console.log(`[Limpieza] Suscripción de pedido eliminada por expiración.`);
                    }
                }
            }
        } else {
            // Caso B: Tu iPhone 6s o navegadores sin soporte Push nativo.
            // Pasa null en la sub, pero ejecuta el guardado en base de datos y el WebSocket
            await sendNotification(null, titulo, mensaje, urlRedireccion, clienteId, tipoNotificacion, pedido_data._id);
        }

        // 2. Respondemos al frontend que ejecutó la acción (ej: el panel de administración)
        res.status(200).send({ pedido: pedido_data });

    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message || 'Error interno en el servidor' });
    }
}

async function finalizado(req, res) {
    const id = req.params['id'];

    try {
        // 1. Actualizamos el pedido a FINISHED
        const pedido_data = await Pedido.findByIdAndUpdate(
            { _id: id }, 
            { status: 'FINISHED' }, 
            { new: true }
        );

        if (!pedido_data) {
            return res.status(403).send({ message: 'No se actualizó el pedido, vuelva a intentar nuevamente.' });
        }

        // 🚀 DISPARO CENTRALIZADO DE NOTIFICACIÓN HÍBRIDA
        // Ahora sí usamos el tipo oficial gracias a tu nuevo ENUM
        const tipoNotificacion = 'PEDIDO_FINALIZADO'; 
        const titulo = '¡Tu pedido ha finalizado! 🍳';
        const mensaje = `Gracias por comprar y usar nuestra App. ¡Vuelve pronto!`;
        
        // Extracción segura del _id del objeto 'user'
        const clienteId = pedido_data.user?._id || pedido_data.user || pedido_data.cliente; 
        const urlRedireccion = `/my-account/pedidos/${pedido_data._id}`;

        // Búsqueda de suscripciones usando el campo correcto 'usuario'
        const subs = await PushSubscription.find({ usuario: clienteId });

        if (subs && subs.length > 0) {
            // Caso A: Dispositivos compatibles registrados (Múltiples endpoints)
            for (const sub of subs) {
                try {
                    await sendNotification(sub.subscription || sub, titulo, mensaje, urlRedireccion, clienteId, tipoNotificacion, pedido_data._id);
                } catch (pushErr) {
                    if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                        await PushSubscription.findByIdAndDelete(sub._id);
                        console.log(`[Limpieza] Suscripción de pedido eliminada por expiración.`);
                    }
                }
            }
        } else {
            // Caso B: Tu iPhone 6s u otros entornos sin soporte push nativo activo.
            // Esto guardará el historial en Mongo con el nuevo ENUM y emitirá por Sockets
            await sendNotification(null, titulo, mensaje, urlRedireccion, clienteId, tipoNotificacion, pedido_data._id);
        }

        // 2. Respondemos al frontend que ejecutó la acción
        res.status(200).send({ pedido: pedido_data });

    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message || 'Error interno en el servidor' });
    }
};



const pedidosbyTiendaId = async(req, res) => {

    var id = req.params['id'];
    try {
        const data_pedido = await Pedido.find({ tienda: id })
            .populate('user', 'first_name last_name email telefono numdoc')
            .sort({ createdAt: -1 });

        res.status(200).send({ pedidos: data_pedido });
    } catch (err) {
        res.status(500).send({ error: err });
    }

};

const pedidosbyTiendaIdUser = async (req, res) => {
    const { tiendaid, userid } = req.params;

    // 1. Validar que ambos IDs tengan el formato correcto de MongoDB
    if (!mongoose.Types.ObjectId.isValid(tiendaid) || !mongoose.Types.ObjectId.isValid(userid)) {
        return res.status(400).send({ 
            message: 'Uno de los IDs proporcionados no es válido.' 
        });
    }

    try {
        const data_pedido = await Pedido.find({ 
            tienda: new mongoose.Types.ObjectId(tiendaid), 
            user: new mongoose.Types.ObjectId(userid)
        })
        .populate('user')
        .sort({ createdAt: -1 });

        res.status(200).send({ pedidos: data_pedido });
    } catch (err) {
        res.status(500).send({ message: 'Error interno', error: err.message });
    }
};


module.exports = {
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
    pedidosbyTiendaIdUser

};