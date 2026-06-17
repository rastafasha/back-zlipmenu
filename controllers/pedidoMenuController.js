const { response } = require('express');
const mongoose = require('mongoose');
const Tienda = require('../models/tienda');
const Usuario = require('../models/usuario');
const Pedido = require('../models/pedidomenu');
const Notificacion = require('../models/notificacion');
const PushSubscription = require('../models/push-subscription');
const { sendNotification } = require('../helpers/notificaciones');

const crearPedidoMenu = async (req, res) => {
    const { user, pedidoList, tienda } = req.body;

    const body = req.body;
    try {

        const existeUsuario = await Usuario.findById(body.user);
        const existeTienda = await Tienda.findById(body.tienda);

        if (!existeUsuario) {
            return res.status(400).json({
                ok: false,
                msg: 'El usuario no existe'
            });
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

        // Guardar pedido
        const pedidoDB = await pedido.save();

        // =========================================================================
        // 🔒 SEGURIDAD COMPLETA: FILTRADO EXACTO POR LOCAL Y PERSISTENCIA DE HISTORIAL
        // =========================================================================
        try {
            const nombreCliente = existeUsuario.first_name || existeUsuario.nombre || 'Un cliente';
            const tituloAdmin = '¡Nuevo Pedido Entrante! 🍕';
            const mensajeAdmin = `${nombreCliente} ha realizado un pedido en tu tienda.`;
            const urlRedireccionAdmin = `/dashboard/tienda/pedidos`;

            // 📝 PASO 1: GUARDAR LA NOTIFICACIÓN EN LA BASE DE DATOS PARA EL HISTORIAL DEL LOCAL
            // Usamos la propiedad 'local' de la Solución 1, dejando 'usuario: null' para que no se ligue con nadie personal
            const nuevaNotificacionLocal = new Notificacion({
                usuario: null,
                local: body.tienda, // Guardamos el ID de la tienda directamente
                titulo: tituloAdmin,
                mensaje: mensajeAdmin,
                tipo: 'NUEVO_PEDIDO',
                referenciaId: pedidoDB._id
            });
            await nuevaNotificacionLocal.save();
            console.log('📝 Historial de notificación registrado para la tienda:', body.tienda);

            // Buscamos los usuarios administradores autorizados para alertas push
            const usuariosAutorizados = await Usuario.find({
                $or: [
                    { role: 'SUPERADMIN' },
                    { role: 'ADMIN', local: body.tienda }
                ]
            });

            const idsAutorizados = usuariosAutorizados.map(u => u._id.toString());

            if (idsAutorizados.length > 0) {
                // Buscamos las suscripciones asociadas a los administradores
                const subsFiltradas = await PushSubscription.find({
                    usuario: { $in: idsAutorizados }
                });

                if (subsFiltradas.length > 0) {
                    // DISPARAMOS EL WEB PUSH AL NAVEGADOR DE FORMA SEGURA
                    subsFiltradas.forEach(async (s) => {
                        try {
                            await sendNotification(
                                s,
                                tituloAdmin,
                                mensajeAdmin,
                                urlRedireccionAdmin,
                                s.usuario,
                                'NUEVO_PEDIDO',
                                pedidoDB._id
                            );
                            console.log(`✅ Push enviado con éxito al dispositivo: ${s.usuario || s.user}`);

                        } catch (err) {
                            console.error('❌ Error capturado al enviar el Web Push:', err);

                            if (err.statusCode === 410 || err.statusCode === 404) {
                                await PushSubscription.findByIdAndDelete(s._id);
                                console.log(`[Limpieza] Suscripción eliminada por expiración.`);
                            }
                        }
                    });
                }
            }
        } catch (errorNotiPedido) {
            console.error('Error de seguridad en notificaciones de pedido:', errorNotiPedido);
        }
        // =========================================================================

        res.json({
            ok: true,
            pedido: pedidoDB
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado... revisar logs'
        });
    }
};


const actualizarPedidoMenu = async (req, res) => {

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

const getPedidoMenus = async (req, res) => {

    const pedidos = await Pedido.find()
        .populate('user', 'nombre email')
        .populate('tienda', 'nombre direccion');
    res.json({
        ok: true,
        pedidos
    });
};
const getPedidoMenusTienda = async (req, res) => {

    const pedidos = await Pedido.find().populate('tienda')
        .populate('driver');


    const tiendaid = req.params.tiendaid;
    const tienda = await Tienda.findById(tiendaid);
    const pedidosTienda = pedidos.filter(pedido => pedido.tienda.toString() === tiendaid)
        ;

    res.json({
        ok: true,
        pedidos,
    });
};

const getPedidoMenu = async (req, res) => {

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


const borrarPedidoMenu = async (req, res) => {

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
        .sort({ createdAt: - 1 });
}

const getPedidosByStatus = async (req, res) => {

    var status = req.params['status'];
    Pedido.find({ status: status })
        .populate('tienda', 'nombre')
        .populate('user', 'telefono numdoc first_name last_name')
        .sort({ createdAt: - 1 })
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
        const tipoNotificacion = 'PEDIDO_APROBADO';
        const titulo = '¡Tu pedido está en proceso! 🍳';
        const mensaje = `El comercio ha aceptado tu orden y ya la está preparando.`;

        // El cliente que realizó la compra
        const clienteId = pedido_data.user || pedido_data.cliente;
        const urlRedireccion = `/my-account/pedidos/${pedido_data._id}`;

        // =========================================================================
        // 📝 PASO 1: GUARDAR EN LA BASE DE DATOS PARA EL HISTORIAL DEL USUARIO
        // =========================================================================
        // Al asignar 'local: null', evitamos que esta notificación de cliente
        // aparezca por error en el historial del negocio.
        const nuevaNotificacionUsuario = new Notificacion({
            usuario: clienteId,
            local: null,
            titulo: titulo,
            mensaje: mensaje,
            tipo: tipoNotificacion,
            referenciaId: pedido_data._id
        });
        await nuevaNotificacionUsuario.save();
        console.log('📝 Historial de notificación registrado para el cliente:', clienteId);
        // =========================================================================

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
            // Pasa null en la sub, pero ejecuta el WebSocket si lo manejas adentro
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
        const tipoNotificacion = 'PEDIDO_FINALIZADO';
        const titulo = '¡Tu pedido ha finalizado! 🍳';
        const mensaje = `Gracias por comprar y usar nuestra App. ¡Vuelve pronto!`;

        // Extracción segura del _id del objeto 'user'
        const clienteId = pedido_data.user?._id || pedido_data.user || pedido_data.cliente;
        const urlRedireccion = `/my-account/pedidos/${pedido_data._id}`;

        // =========================================================================
        // 📝 PASO 1: GUARDAR EN LA BASE DE DATOS PARA EL HISTORIAL DEL USUARIO
        // =========================================================================
        // Fijamos local en null para romper definitivamente el ligue con el comercio
        const nuevaNotificacionUsuario = new Notificacion({
            usuario: clienteId,
            local: null,
            titulo: titulo,
            mensaje: mensaje,
            tipo: tipoNotificacion,
            referenciaId: pedido_data._id
        });
        await nuevaNotificacionUsuario.save();
        console.log('📝 Historial de notificación registrado para el cliente:', clienteId);
        // =========================================================================

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
            await sendNotification(null, titulo, mensaje, urlRedireccion, clienteId, tipoNotificacion, pedido_data._id);
        }

        // 2. Respondemos al frontend que ejecutó la acción
        res.status(200).send({ pedido: pedido_data });

    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message || 'Error interno en el servidor' });
    }
};




const pedidosbyTiendaId = async (req, res) => {
    var id = req.params['id'];
    try {
        const data_pedido = await Pedido.find({ tienda: id })
            .populate('user', 'first_name last_name email telefono numdoc')
            .populate('tienda', 'nombre slug categorias subcategoria')
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