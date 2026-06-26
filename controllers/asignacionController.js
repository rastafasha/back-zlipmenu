const { response } = require('express');
const mongoose = require('mongoose');
const Tienda = require('../models/tienda');
const Pedido = require('../models/pedidomenu');
const Driver = require('../models/driver');
const Asignacion = require('../models/asignardelivery');
const Notificacion = require('../models/notificacion');
const PushSubscription = require('../models/push-subscription');
const { sendNotification } = require('../helpers/notificaciones');


const crearAsignacion = async (req, res) => {

    const { driver, status, tienda, pedido } = req.body;

    const body = req.body;
    try {

        const existeDriver = await Driver.findById(body.driver);

        const existeTienda = await Tienda.findById(body.tienda);
        const existePedido = await Pedido.findById(body.pedido);

        if (!existeDriver) {
            return res.status(400).json({
                ok: false,
                msg: 'El Conductor no existe'
            })
        }
        if (!existeTienda) {
            return res.status(400).json({
                ok: false,
                msg: 'La tienda no existe'
            });
        }
        if (!existePedido) {
            return res.status(400).json({
                ok: false,
                msg: 'el pedido no existe'
            });
        }


        const asignacion = new Asignacion({
            driver: body.driver,
            tienda: body.tienda,
            pedido: body.pedido,
            status: body.status,
        });

        
        // =========================================================================
        // 🚀 NUEVA LÓGICA: Notificar al admin que esta en camino el pedido
        // =========================================================================
        try {
            const tituloAdmin = 'Pedido Asignado ✨';
            const mensajeAdmin = `El Pedido ha sido asignado para envio.`;
            const urlRedireccionAdmin = `/dashboard/ventas/modulo`;
            // 📝 PASO 1: GUARDAR UNA SOLA NOTIFICACIÓN PARA EL HISTORIAL COMPARTIDO DEL LOCAL
            // Seteamos usuario en null y enlazamos directamente al ID de la tienda/local
            const nuevaNotiLocal = new Notificacion({
                usuario: null,
                local: body.tienda, // Guardamos el ID de la tienda directamente
                titulo: tituloAdmin,
                mensaje: mensajeAdmin,
                tipo: 'PEDIDO_ENVIADO',
                pedido: body.pedido, 
                leido: false // Aseguramos que nazca en falso para encender el globo
            });
            await nuevaNotiLocal.save();
            console.log(`📝 Historial de pago registrado exclusivamente para el local:`, idTiendaTarget);

            // 2. Buscamos los usuarios administradores dueños de ESTA tienda específica
            const usuariosAutorizados = await Usuario.find({
                $or: [
                    { role: 'SUPERADMIN' },
                    { role: 'ADMIN', local: body.tienda } // Evita que se crucen los paneles
                ]
            });

            const idsAutorizados = usuariosAutorizados.map(u => u._id.toString());

            if (idsAutorizados.length > 0) {
                // 2. Buscamos las suscripciones push asociadas exclusivamente a esos administradores
                const subsFiltradas = await PushSubscription.find({
                    usuario: { $in: idsAutorizados }
                });

                if (subsFiltradas.length > 0) {
                    // 2. Buscamos las suscripciones push asociadas exclusivamente a esos administradores
                    const subsFiltradas = await PushSubscription.find({
                        usuario: { $in: idsAutorizados }
                    });

                    // 🚀 PASO 2: DESPACHAMOS EL WEB PUSH EN TIEMPO REAL A LOS DISPOSITIVOS
                    subsFiltradas.forEach(s => {
                        sendNotification(
                            s.subscription, // 🔧 REPARADO: Pasamos el objeto de suscripción limpio igual que en reservas
                            tituloAdmin,
                            mensajeAdmin,
                            urlRedireccionAdmin,
                            s.usuario,
                            'NUEVO_PAGO',
                            id
                        ).catch(err => {
                            console.error('Error enviando push de pago:', err);
                            if (err.statusCode === 410 || err.statusCode === 404) {
                                s.deleteOne().catch(e => console.log('Error eliminando sub obsoleta', e));
                            }
                        });
                    });

                }
            }

        } catch (errorNotiPago) {
            console.error('Error en bloque de notificaciones de pago:', errorNotiPago);
        }


        await Pedido.findByIdAndUpdate(req.body.pedido, { asignado: true });

        //guardar asignacion
        await asignacion.save();

        res.json({
            ok: true,
            asignacion
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado... revisar logs'
        });
    }


};

const actualizarAsignacion = async (req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const asignacion = await Asignacion.findById(id);
        if (!asignacion) {
            return res.status(500).json({
                ok: false,
                msg: 'asignacion no encontrado por el id'
            });
        }
        const driver = await Driver.findById(id);
        if (!driver) {
            return res.status(500).json({
                ok: false,
                msg: 'driver no encontrado por el id'
            });
        }

        const cambiosAsignacion = {
            ...req.body,
            usuario: uid
        }

        const asignacionActualizado = await Asignacion.findByIdAndUpdate(id, cambiosAsignacion, { new: true });

        res.json({
            ok: true,
            asignacionActualizado,
            driver
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};


const actualizarAsignacionCoord = async (req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const asignacion = await Asignacion.findById(id);
        if (!asignacion) {
            return res.status(500).json({
                ok: false,
                msg: 'asignacion no encontrado por el id'
            });
        }

        const cambiosAsignacion = {
            ...req.body,
            usuario: uid
        }

        const asignacionActualizado = await Asignacion.findByIdAndUpdate(id, cambiosAsignacion, { new: true });

        res.json({
            ok: true,
            asignacionActualizado
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};

const getAsignacions = async (req, res) => {

    const asignacions = await Asignacion.find()


    res.json({
        ok: true,
        asignacions
    });
};
const getAsignacionsTienda = async (req, res) => {
    try {
        const tiendaid = req.params.tiendaid;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [asignacions, total] = await Promise.all([
            Asignacion.find({ tienda: tiendaid })
                .populate('driver')
                .populate('tienda')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Asignacion.countDocuments({ tienda: tiendaid })
        ]);

        res.json({
            ok: true,
            asignacions,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error al obtener asignaciones' });
    }
};
const getAsignacionsPedido = async (req, res) => {
    try {
        const pedidoid = req.params.pedidoid;

        const [asignacions, total] = await Promise.all([
            Asignacion.find({ pedido: pedidoid })
                // .populate('driver')
                // .populate('tienda')
                .lean(),
            Asignacion.countDocuments({ pedido: pedidoid  })
        ]);

        res.json({
            ok: true,
            asignacions,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error al obtener asignaciones' });
    }
};

const getAsignacion = async (req, res) => {

    const id = req.params.id;

    Asignacion.findById(id)
        .populate('driver')
        .populate('pedido')
        .populate('tienda')
        .exec((err, asignacion) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar asignacion',
                    errors: err
                });
            }
            if (!asignacion) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El asignacion con el id ' + id + 'no existe',
                    errors: { message: 'No existe un asignacion con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                asignacion: asignacion
            });
        });

};


const borrarAsignacion = async (req, res) => {

    const id = req.params.id;

    try {

        const asignacion = await Asignacion.findById(id);
        if (!asignacion) {
            return res.status(500).json({
                ok: false,
                msg: 'asignacion no encontrado por el id'
            });
        }
        await Pedido.findByIdAndUpdate(req.body.pedido, { asignado: false });
        await asignacion.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'asignacion eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};

const listarAsignacionPorDriver = (req, res) => {
    var driver = req.params['id'];
    Asignacion.find({ driver: driver }, (err, data_asignacion) => {
        if (!err) {
            if (data_asignacion) {
                res.status(200).send({ asignacions: data_asignacion });
            } else {
                res.status(500).send({ error: err });
            }
        } else {
            res.status(500).send({ error: err });
        }
    }).populate('pedido')
    .sort({ createdAt: - 1 });
}

const listarAsignacionPorUser = async (req, res) => {
    var id = req.params['id'];
    try {
        // First find all ventas for this user
        const pedidos = await Pedido.find({ user: id });
        const pedidoIds = pedidos.map(v => v._id);

        // Then find assignments for these ventas
        Asignacion.find({ venta: { $in: pedidoIds } }, (err, data_asignacion) => {
            if (!err) {
                if (data_asignacion) {
                    res.status(200).send({ asignacions: data_asignacion });
                } else {
                    res.status(500).send({ error: err });
                }
            } else {
                res.status(500).send({ error: err });
            }
        })
            .sort({ createdAt: -1 });
    } catch (err) {
        res.status(500).send({ error: err });
    }
}


function activar(req, res) {
    var id = req.params['id'];
    // console.log(id);
    Asignacion.findByIdAndUpdate({ _id: id },
        { status: 'En Camino' },
        { statusD: 'En Camino' },
        (err, asignacion_data) => {
            if (err) {
                res.status(500).send({ message: err });
            } else {
                if (asignacion_data) {
                    res.status(200).send({ asignacion: asignacion_data });
                } else {
                    res.status(403).send({ message: 'No se actualizó el asignacion, vuelva a intentar nuevamente.' });
                }
            }
        })
}

// Asegúrate de tener importado mongoose en la parte superior del archivo


async function entregado(req, res) {
    const id = req.params['id'];
    
    try {
        const asignacion_data = await Asignacion.findByIdAndUpdate(
            id, 
            { status: 'Entregado'}, 
            { new: true }
        );

        if (!asignacion_data) {
            return res.status(404).json({ ok: false, message: 'No se encontró la asignación.' });
        }

        

        return res.status(200).json({ 
            ok: true,
            asignacion: asignacion_data 
        });

    } catch (error) {
        console.error('Error en controlador entregado:', error);
        if (!res.headersSent) {
            return res.status(500).json({ ok: false, msg: 'Error interno en el servidor.' });
        }
    }
}



async function recibido(req, res) {
    const id = req.params['id'];
    
    try {
        // 1. Agrupamos ambos campos de estado en el segundo parámetro
        const asignacion_data = await Asignacion.findByIdAndUpdate(
            id, 
            { status: 'Confirmado' }, 
            { new: true } // Nos devuelve el registro con los cambios ya aplicados
        );

        // 2. Si el ID no existe en la base de datos, respondemos de inmediato
        if (!asignacion_data) {
            return res.status(404).json({ 
                ok: false, 
                message: 'No se encontró la asignación para confirmar.' 
            });
        }
        
        // 3. Respuesta exitosa única para tu app de Angular
        return res.status(200).json({ 
            ok: true,
            asignacion: asignacion_data 
        });

    } catch (error) {
        console.error('Error en controlador recibido:', error);
        return res.status(500).json({ 
            ok: false, 
            msg: 'Error interno en el servidor al confirmar recepción.' 
            
        });
    }
}


const getAsignacionsByStatus = async (req, res) => {
    const id = req.params['id'];
    const status = req.params['status'];

    try {
        // 1. Convertimos el string de la URL en un ObjectId real de MongoDB
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                ok: false,
                error: 'El ID del chofer provisto no es un ObjectId válido.'
            });
        }
        const driverObjectId = new mongoose.Types.ObjectId(id.trim());

        // 2. 💡 CLAVE: Usamos el modelo exacto 'AsignarDelivery' para hacer la consulta
        const data_asignacion = await Asignacion.find({ 
            driver: driverObjectId, 
            status: status 
        }).sort({ createdAt: -1 });

        // 3. Enviamos la respuesta. Si hay datos, los verás en pantalla de inmediato
        return res.status(200).json({ 
            ok: true,
            asignacions: data_asignacion 
        });

    } catch (error) {
        console.error('Error crítico en getAsignacionsByStatus:', error);
        if (!res.headersSent) {
            return res.status(500).json({ 
                ok: false, 
                error: 'Error interno en el servidor al consultar las asignaciones por estatus.' 
            });
        }
    }
};





module.exports = {
    crearAsignacion,
    actualizarAsignacion,
    actualizarAsignacionCoord,
    getAsignacions,
    getAsignacion,
    borrarAsignacion,
    listarAsignacionPorDriver,
    listarAsignacionPorUser,
    getAsignacionsTienda,
    getAsignacionsPedido,
    entregado,
    activar,
    recibido,
    getAsignacionsByStatus

};