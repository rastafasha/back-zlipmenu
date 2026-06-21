const { response } = require('express');
const Transferencia = require('../models/transferencia');
const Congeneral = require('../models/congeneral');
const ventaController = require('./ventaController');
const Pedido = require('../models/pedidomenu');
const Tienda = require('../models/tienda');
const Direccion = require('../models/direccion');
const Notificacion = require('../models/notificacion');
const Usuario = require('../models/usuario');
const PushSubscription = require('../models/push-subscription');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const { sendNotification } = require('../helpers/notificaciones');
const { enviarMensajeWhatsApp } = require('../helpers/whatsapp-helper');

const transporter = nodemailer.createTransport(smtpTransport({
    host: process.env.HOST_EMAIL,
    port: process.env.PORT_EMAIL || 465,
    secure: process.env.PORT_EMAIL == 465,
    auth: {
        user: process.env.EMAIL_BACKEND,
        pass: process.env.PASSWORD_APP
    }
}));

const getTransferencias = async (req, res) => {

    const transferencias = await Transferencia.find()
        .sort({ createdAt: -1 })
        .populate('metodo_pago')
        ;

    res.json({
        ok: true,
        transferencias
    });
};

const getTransferencia = async (req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Transferencia.findById(id)
        .exec((err, payment) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar payment',
                    errors: err
                });
            }
            if (!payment) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'Transferencia con el id ' + id + 'no existe',
                    errors: { message: 'No existe una Transferencia con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                payment: payment
            });
        });

};

const crearTransferencia = async (req, res) => {
    const uid = req.uid; // ID del cliente que reporta el pago

    // 🔧 SEGURIDAD DE ENTRADA: Capturamos el ID de la tienda del body tal cual lo haces en pedidos
    const idTiendaTarget = req.body.local;

    const transferencia = new Transferencia({
        user: uid,
        local: idTiendaTarget, // Aseguramos que se guarde amarrado a la tienda
        ...req.body
    });



    try {
        const transferenciaDB = await transferencia.save();
        const id = transferenciaDB._id;

        // =========================================================================
        // 🚀 ENLACE LOGÍSTICO REPARADO: VINCULACIÓN DE DIRECCIÓN AL PEDIDO
        // =========================================================================
        // req.body.pedido contiene el ID del documento 'pedidomenu' que se acaba de pagar
        if (req.body.pedido) {
            
            // 🧠 PASO 1: Buscamos la ubicación más reciente calculada por el GPS para este cliente
            const ultimaDireccionUsuario = await Direccion.findOne({ user: uid }).sort({ createdAt: -1 });

            let datosAActualizar = {
                status: 'NEW' // Al recibir el pago, el pedido se activa para el ERP
            };

            // 🛵 PASO 2: Si el satélite guardó una dirección, se la enlazamos de una vez al pedido
            if (ultimaDireccionUsuario) {
                datosAActualizar.direccion = ultimaDireccionUsuario._id; // Al campo ref: 'direccion'
                datosAActualizar.deliveryAddres = ultimaDireccionUsuario.direccion; // Copia en texto de respaldo
                console.log(`📌 Dirección ID [${ultimaDireccionUsuario._id}] enlazada al Pedido ID [${req.body.pedido}]`);
            }

            // 📝 PASO 3: Actualizamos la colección definitiva 'pedidomenus'
            // Revisa si tu modelo importado se llama Pedido o PedidoMenu en tu backend
            await Pedido.findByIdAndUpdate(req.body.pedido, datosAActualizar, { new: true });
            console.log(`⚡ PedidoMenu [${req.body.pedido}] actualizado y listo para el chofer.`);
        }
        // =========================================================================

        // =========================================================================
        // 🚀 NUEVA LÓGICA REPARADA: FILTRADO EXACTO POR TIENDA (Igual que en pedidos)
        // =========================================================================
        try {
            const tituloAdmin = '¡Nuevo Pago Registrado! 💰';
            const mensajeAdmin = `El cliente reportó una transferencia por ${transferenciaDB.amount || 0}$.`;
            const urlRedireccionAdmin = `/dashboard/transferencias`;
            // 📝 PASO 1: GUARDAR UNA SOLA NOTIFICACIÓN PARA EL HISTORIAL COMPARTIDO DEL LOCAL
            // Seteamos usuario en null y enlazamos directamente al ID de la tienda/local
            const nuevaNotiLocal = new Notificacion({
                usuario: null,
                local: idTiendaTarget, // Guardamos el ID de la tienda directamente
                titulo: tituloAdmin,
                mensaje: mensajeAdmin,
                tipo: 'NUEVO_PAGO',
                referenciaId: id,
                leido: false // Aseguramos que nazca en falso para encender el globo
            });
            await nuevaNotiLocal.save();
            console.log(`📝 Historial de pago registrado exclusivamente para el local:`, idTiendaTarget);

            // 2. Buscamos los usuarios administradores dueños de ESTA tienda específica
            const usuariosAutorizados = await Usuario.find({
                $or: [
                    { role: 'SUPERADMIN' },
                    { role: 'ADMIN', local: idTiendaTarget } // Evita que se crucen los paneles
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

            // =========================================================================
            // 📱 DISPARO DE WHATSAPP Y EMAIL EXTERNOS (CANALES AUTOMÁTICOS)
            // =========================================================================
            if (idTiendaTarget) {
                const tiendaDB = await Tienda.findById(idTiendaTarget);

                if (tiendaDB) {
                    const localIdStr = tiendaDB._id.toString();
                    const nombreRestaurante = tiendaDB.nombre || 'el restaurante';

                    let telefonoTienda = tiendaDB.telefono ? tiendaDB.telefono.replace(/\D/g, '') : '';
                    if (telefonoTienda.startsWith('0')) {
                        telefonoTienda = '58' + telefonoTienda.substring(1);
                    }

                    const textoWhatsApp = `¡Alerta de Pago! 💰 Se ha reportado una nueva transferencia para *${nombreRestaurante}*.\n\n` +
                        `💵 *Monto:* ${transferenciaDB.amount || 0}$.\n` +
                        `📝 *Referencia:* ${transferenciaDB.reference || 'N/A'}\n\n` +
                        `Por favor, verifique su panel administrativo para confirmar los fondos. ✨`;

                    // Envío de WhatsApp real usando tu helper activo
                    if (telefonoTienda) {
                        enviarMensajeWhatsApp(localIdStr, telefonoTienda, textoWhatsApp)
                            .then(enviado => {
                                if (enviado) console.log(`💬 WhatsApp de pago entregado al restaurante: ${localIdStr}`);
                            })
                            .catch(err => console.error('Error enviando WhatsApp de pago:', err.message));
                    }

                    // Envío de correo corporativo al administrador del local
                    // const correoDestinoAdmin = tiendaDB.emailAdmin || tiendaDB.email;
                    // if (correoDestinoAdmin) {
                    //     transporter.sendMail({
                    //         from: process.env.EMAIL_BACKEND,
                    //         to: correoDestinoAdmin,
                    //         subject: `🚨 Alerta de Pago: Nueva Transferencia en ${nombreRestaurante} 💰`,
                    //         text: textoWhatsApp.replace(/\*/g, '') // Quitamos las negritas de WhatsApp para el mail
                    //     }).then(() => {
                    //         console.log(`=== Correo de alerta de pago enviado a: ${correoDestinoAdmin} ===`);
                    //     }).catch(emailError => {
                    //         console.error('Error enviando correo de pago:', emailError.message);
                    //     });
                    // }
                }
            }

        } catch (errorNotiPago) {
            console.error('Error en bloque de notificaciones de pago:', errorNotiPago);
        }

        // Retornamos la respuesta inmediata al cliente de Angular
        res.json({
            ok: true,
            transferencia: transferenciaDB
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }
};



const actualizarTransferencia = async (req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const transferencia = await Transferencia.findById(id);
        if (!transferencia) {
            return res.status(500).json({
                ok: false,
                msg: 'transferencia no encontrado por el id'
            });
        }

        // Update fields
        Object.assign(transferencia, req.body);
        transferencia.usuario = uid;

        // Update updatedAt if status changed
        if (req.body.status !== undefined && req.body.status !== transferencia.status) {
            transferencia.updatedAt = new Date();
        }

        const transferenciaActualizado = await transferencia.save();

        res.json({
            ok: true,
            transferenciaActualizado
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};

const borrarTransferencia = async (req, res) => {

    const id = req.params.id;

    try {

        const transferencia = await Transferencia.findById(id);
        if (!transferencia) {
            return res.status(500).json({
                ok: false,
                msg: 'transferencia no encontrado por el id'
            });
        }

        await Transferencia.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'transferencia eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};

const listarPorUsuario = (req, res) => {
    var id = req.params['id'];
    Transferencia.find({ user: id }, (err, data_transferencia) => {
        if (!err) {
            if (data_transferencia) {
                res.status(200).send({ transferencias: data_transferencia });
            } else {
                res.status(500).send({ error: err });
            }
        } else {
            res.status(500).send({ error: err });
        }
    });
}

const updateStatus = async (req, res) => {
    const id = req.params.id;
    const uid = req.uid; // ID del administrador que cambia el estado
    const { status, observaciones } = req.body;

    try {
        // 1. Buscamos la transferencia original e incluimos el pedido
        const transferencia = await Transferencia.findById(id).populate('pedido');
        if (!transferencia) {
            return res.status(404).json({
                ok: false,
                msg: 'Transferencia no encontrada por el id'
            });
        }

        const clienteId = transferencia.user;
        const antiguoEstado = transferencia.status;

        // Actualizar campos en la BD
        Object.assign(transferencia, req.body);
        transferencia.usuario = uid; // Aquí 'usuario' pasa a ser el admin validador

        // 🟢 Asignamos las observaciones al documento (asume que tu modelo Transferencia tiene este campo)
        transferencia.observaciones = observaciones || '';

        if (status !== undefined && status !== antiguoEstado) {
            transferencia.updatedAt = new Date();
        }

        const transferenciaActualizado = await transferencia.save();

        // =========================================================================
        // 🗑️ LÓGICA ANTI-ESTAFA: ELIMINACIÓN AUTOMÁTICA SI EL PAGO ES RECHAZADO
        // =========================================================================

        if (estadoNormalizado === 'rechazado' || estadoNormalizado === 'no' || status === 'false') {
            console.log(`❌ Pago rechazado por el administrador. Motivo: ${observaciones}`);

            // Extraemos el ID del pedido amarrado a esta transferencia
            // Usamos un condicional por si viene poblado como objeto o viene el ID directo como String
            const idPedidoReal = transferencia.pedido?._id || transferencia.pedido;

            if (idPedidoReal) {
                // 1. Borramos el pedido de la colección 'pedidomenus' para limpiar el ERP de la cocina
                await PedidoMenu.findByIdAndDelete(idPedidoReal);
                console.log(`🗑️ Pedido basura ${idPedidoReal} eliminado de MongoDB.`);
            }

            // 2. Borramos la transferencia falsa de la colección 'transferencias' para no dejar basura financiera
            await Transferencia.findByIdAndDelete(id);
            console.log(`🗑️ Transferencia fraudulenta ${id} eliminada de MongoDB.`);

            // 3. Respondemos con éxito avisando al panel que la orden fue destruida
            return res.json({
                ok: true,
                msg: 'Intento de estafa detectado. Pedido y transferencia eliminados del sistema.',
                motivo: observaciones || 'No especificado'
            });
            
            // 🛑 Detenemos la ejecución aquí para que no intente crear la venta de abajo
        }

        // =========================================================================
        // 🚀 NUEVA LÓGICA: GENERAR VENTA AUTOMÁTICA AL APROBAR
        // =========================================================================
        const estadoNormalizado = status ? status.toLowerCase() : '';
        if (estadoNormalizado === 'aprobado' || estadoNormalizado === 'aproved' || status === 'ok') {

            // 1. Extraemos la lista de forma segura sin importar si 'pedido' viene como Objeto o ID directo
            const pedidoObjeto = transferencia.pedido;
            const listaProductos = (pedidoObjeto && pedidoObjeto.pedidoList) ? pedidoObjeto.pedidoList : [];

            // 2. Mapeamos las pizzas al formato compatible con tu bucle
            const detallesVenta = listaProductos.map(item => ({
                producto: item._id,
                cantidad: item.cantidad,
                precio: item.precio_ahora,
                color: item.color || '#333',
                selector: item.nombre_selector || 'unico',
                selector_elegido: item.selector_elegido,
            }));

            // 3. Extraemos de forma limpia el ID del método de pago si viene como objeto
            const idMetodoPago = (transferencia.metodo_pago && transferencia.metodo_pago._id)
                ? transferencia.metodo_pago._id
                : transferencia.metodo_pago;

            const mockReq = {
                body: {
                    user: clienteId,
                    local: transferencia.local,
                    total_pagado: transferencia.amount,

                    // 🟢 SOLUCIÓN 1: Enviamos solo la cadena del ID limpio del método de pago
                    metodo_pago: idMetodoPago,

                    referencia: transferencia.referencia,
                    idtransaccion: transferencia.referencia,

                    // 🟢 SOLUCIÓN 2: Enviamos el arreglo con los productos mapeados
                    detalles: detallesVenta,

                    precio_envio: pedidoObjeto?.precio_envio || 0,
                    tipo_envio: pedidoObjeto?.tipo_envio || 'Local',
                    direccion: pedidoObjeto?.direccion || 'N/A',
                    destinatario: pedidoObjeto?.destinatario || transferencia.name_person || 'N/A',
                    tiempo_estimado: pedidoObjeto?.tiempo_estimado || 'Inmediato',
                    pais: pedidoObjeto?.pais || 'Venezuela',
                    zip: pedidoObjeto?.zip || '1010',
                    ciudad: pedidoObjeto?.ciudad || 'Caracas'
                }
            };

            const mockRes = {
                status: function (statusCode) {
                    this.statusCode = statusCode;
                    return this;
                },
                send: function (data) {
                    this.responseData = data;
                    return this;
                },
                json: function (data) {
                    this.responseData = data;
                    return this;
                }
            };

            try {
                // Ejecutamos tu controlador pasándole el mock limpio
                ventaController.registro(mockReq, mockRes);

                setTimeout(() => {
                    console.log('Resultado real tras limpiar tipos:', mockRes.responseData);
                }, 600); // Retraso prudencial para asimilar el save de Mongoose

            } catch (errorVenta) {
                console.error('Error crítico al ejecutar ventaController.registro:', errorVenta);
            }
        }

        // =========================================================================

        // 🚀 DISPARO CENTRALIZADO DE NOTIFICACIÓN HYBRIDA
        if (status !== undefined && status !== antiguoEstado) {

            const esAprobado = estadoNormalizado === 'aprobado' || estadoNormalizado === 'aproved' || status === 'ok';

            let tipoNotificacion = esAprobado ? 'PAGO_APROBADO' : 'PAGO_RECHAZADO';
            let titulo = esAprobado ? '¡Pago Aprobado! 🎉' : 'Pago Rechazado ❌';
            let mensaje = esAprobado
                ? 'Tu transferencia ha sido verificada con éxito.'
                : `Hubo un problema con tu transferencia. Motivo: ${req.body.observaciones || 'Datos incorrectos'}`;

            const urlRedireccion = `/mis-pagos`;

            // =========================================================================
            // 📝 PASO 1: GUARDAR EN LA BASE DE DATOS PARA EL HISTORIAL DEL CLIENTE
            // =========================================================================
            // Al definir local: null garantizamos que no aparezca en el historial del comercio
            const nuevaNotificacionUsuario = new Notificacion({
                usuario: clienteId,
                local: transferencia.local,
                titulo: titulo,
                mensaje: mensaje,
                tipo: tipoNotificacion,
                referenciaId: transferencia._id,
                leido: false
            });
            await nuevaNotificacionUsuario.save();
            console.log(`📝 Historial de notificación [${tipoNotificacion}] guardado para el cliente:`, clienteId);
            // =========================================================================

            // Buscamos los dispositivos Push usando el clienteId correcto que guardamos arriba
            const subs = await PushSubscription.find({ usuario: clienteId });

            if (subs.length > 0) {
                subs.forEach(s => {
                    sendNotification(
                        s.subscription,
                        titulo,
                        mensaje,
                        urlRedireccion,
                        clienteId,
                        tipoNotificacion,
                        transferencia._id
                    ).catch(err => {
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            s.deleteOne().catch(e => console.log('Error eliminando sub', e));
                        }
                    });
                });
            } else {
                await sendNotification(
                    null,
                    titulo,
                    mensaje,
                    urlRedireccion,
                    clienteId,
                    tipoNotificacion,
                    transferencia._id
                );
            }
        }

        res.json({
            ok: true,
            transferenciaActualizado
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
}

function sendEmailAdmin(user, id) {
    const texto = `Hola! El usuario ${user} ha realizado una compra con transferencia bancaria cuyo id es ${id}`;
    // traemos el email de congeneralController para enviar el correo
    //buscamos en el modelo
    // Congeneral.findById(id)

    const mailOptions = {
        from: 'tu-email@gmail.com', // Remitente
        to: process.env.EMAIL_DEST,
        subject: 'Nueva Compra con Transferencia Bancaria',
        text: texto,
        html: `
            <p>${texto}</p>
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
        }
        else {
            console.log('Correo enviado: ' + info.response);
        }
    })
    // enviarWhatsappSencillo();
}


const byTienda = async (req, res) => {

    var tiendaid = req.params['tiendaid'];
    try {
        const data_transferencia = await Transferencia.find({ local: tiendaid })
            .populate('metodo_pago')
            .populate('local')
            .populate('pedido')
            .sort({ createdAt: -1 });

        res.status(200).send({ transferencias: data_transferencia });
    } catch (err) {
        res.status(500).send({ error: err });
    }

};


const listarPagosPorUsuario = (req, res) => {
    var id = req.params['id'];
    const page = parseInt(req.query.page) || 1;
    const limit = 4; // Tu límite actual
    const skip = (page - 1) * limit; // Cuántos posts saltar

    Transferencia.find({ user: id })
        .populate('pedido')
        .populate('metodo_pago', 'tipo bankName')
        .sort({ createdAt: -1 })
        .skip(skip)   // <-- Nos saltamos los ya cargados
        .limit(limit) // <-- Traemos los siguientes 4
        .exec((err, data) => {
            if (err) {
                return res.status(500).send({ ok: false, message: 'Error en el servidor' });
            }

            if (data) {
                // Es buena práctica enviar 'ok: true' para que coincida con tu map del frontend
                res.status(200).send({
                    ok: true,
                    transferencias: data
                });
            } else {
                res.status(404).send({ ok: false, transferencias: [] });
            }
        });
}

module.exports = {
    getTransferencias,
    crearTransferencia,
    actualizarTransferencia,
    borrarTransferencia,
    getTransferencia,
    listarPorUsuario,
    updateStatus,
    byTienda,
    listarPagosPorUsuario
};