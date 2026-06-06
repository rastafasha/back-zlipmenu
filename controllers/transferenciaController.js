const { response } = require('express');
const Transferencia = require('../models/transferencia');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const Congeneral = require('../models/congeneral');
const ventaController = require('./ventaController');
const Notificacion = require('../models/notificacion');
const PushSubscription = require('../models/push-subscription');
const { sendNotification } = require('../helpers/notificaciones');




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
const { enviarMensajeWhatsApp } = require('../helpers/whatsapp-helper');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const Tienda = require('../models/tienda'); // Tu modelo de tiendas
// Asegúrate de importar tus modelos de Notificacion, PushSubscription y sendNotification aquí arriba

// Configuración de tu Nodemailer para dominio propio (Igual al del Cron)
const transporter = nodemailer.createTransport(smtpTransport({
    host: process.env.EMAIL_SMTP_HOST,
    port: process.env.EMAIL_SMTP_PORT || 465,
    secure: process.env.EMAIL_SMTP_PORT == 465,
    auth: {
        user: process.env.EMAIL_BACKEND,
        pass: process.env.EMAIL_BACKEND_PASS
    }
}));

const crearTransferencia = async (req, res) => {

    const uid = req.uid; // ID del cliente que crea la transferencia
    const transferencia = new Transferencia({
        user: uid,
        ...req.body
    });

    try {
        const transferenciaDB = await transferencia.save();
        const id = transferenciaDB._id;

        // =========================================================================
        // 🚀 NUEVA LÓGICA: NOTIFICAR A DUEÑOS (ADMIN) Y SUPERADMINS + WHATSAPP & EMAIL
        // =========================================================================
        try {
            // 1. Buscamos las suscripciones Push y cargamos la información de sus usuarios
            const todasLasSubs = await PushSubscription.find().populate('usuario');

            // 2. Filtramos solo las que pertenecen a SUPERADMIN o ADMIN (dueños de tiendas)
            const adminsSubs = todasLasSubs.filter(sub => {
                return sub.usuario && (sub.usuario.role === 'SUPERADMIN' || sub.usuario.role === 'ADMIN');
            });

            if (adminsSubs.length > 0) {
                const tituloAdmin = '¡Nuevo Pago Registrado! 💰';
                const mensajeAdmin = `El cliente reportó una transferencia por ${transferenciaDB.amount || ''}$.`;
                const urlRedireccionAdmin = `/dashboard/transferencias`;

                // Agrupamos los IDs de los administradores únicos para no duplicar filas en la BD
                const adminIdsUnicos = [...new Set(adminsSubs.map(s => s.usuario._id.toString()))];

                // 3. GUARDAMOS EN TU SCHEMA DE NOTIFICACIONES (Para la campana en sus paneles)
                const promesasNotificaciones = adminIdsUnicos.map(adminId => {
                    const nuevaNoti = new Notificacion({
                        usuario: adminId,
                        titulo: tituloAdmin,
                        mensaje: mensajeAdmin,
                        tipo: 'NUEVO_PAGO', // Satisface tu ENUM permitido
                        referenciaId: id
                    });
                    return nuevaNoti.save();
                });
                await Promise.all(promesasNotificaciones);

                // 4. DISPARAMOS EL WEB PUSH AL NAVEGADOR O CELULAR DE CADA UNO
                adminsSubs.forEach(s => {
                    sendNotification(
                        s.subscription,
                        tituloAdmin,
                        mensajeAdmin,
                        urlRedireccionAdmin,
                        s.usuario._id,
                        'NUEVO_PAGO',
                        id
                    ).catch(err => {
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            s.deleteOne().catch(e => console.log('Error eliminando sub obsoleta', e));
                        }
                    });
                });
            }

            // =========================================================================
            // 📱 DISPARO DE WHATSAPP Y EMAIL EXTERNOS (CANALES AUTOMÁTICOS)
            // =========================================================================
            // Extraemos de forma segura el ID de la tienda del cuerpo o de la transferencia
            // Asegúrate de que el req.body mande la propiedad que asocia la tienda (ej: tienda o local)
            const tiendaId = transferenciaDB.tienda || transferenciaDB.local || req.body.tiendaId;

            if (tiendaId) {
                // Buscamos la tienda en MongoDB para extraer sus configuraciones de notificaciones, email y teléfono
                const tiendaDB = await Tienda.findById(tiendaId);

                if (tiendaDB) {
                    const localIdStr = tiendaDB._id.toString();
                    const nombreRestaurante = tiendaDB.nombre || 'el restaurante';
                    
                    // Formateamos el teléfono de la tienda usando la lógica limpia
                    let telefonoTienda = tiendaDB.telefono ? tiendaDB.telefono.replace(/\D/g, '') : '';
                    if (telefonoTienda.startsWith('0')) {
                        telefonoTienda = '58' + telefonoTienda.substring(1);
                    }

                    // Construimos los textos informativos con negritas para WhatsApp
                    const textoWhatsApp = `¡Alerta de Pago! 💰 Se ha reportado una nueva transferencia para *${nombreRestaurante}*.\n\n` +
                                          `💵 *Monto:* ${transferenciaDB.amount || ''}$.\n` +
                                          `📝 *Referencia:* ${transferenciaDB.reference || 'N/A'}\n` +
                                          `👤 *Cliente ID:* ${uid}\n\n` +
                                          `Por favor, verifique su panel administrativo para confirmar los fondos. ✨`;

                    const textoEmail = `Alerta de Pago: Se ha reportado una nueva transferencia para ${nombreRestaurante}.\n\n` +
                                       `Monto: ${transferenciaDB.amount || ''}$.\n` +
                                       `Referencia: ${transferenciaDB.reference || 'N/A'}\n` +
                                       `Cliente ID: ${uid}\n\n` +
                                       `Por favor, verifique su panel administrativo para confirmar los fondos.`;

                    // Envió asíncrono de WhatsApp (No bloquea la respuesta al cliente)
                    if (telefonoTienda) {
                        enviarMensajeWhatsApp(localIdStr, telefonoTienda, textoWhatsApp)
                            .then(enviado => {
                                if (enviado) console.log(`💬 WhatsApp de pago enviado al restaurante: ${localIdStr}`);
                            })
                            .catch(err => console.error('Error enviando WhatsApp de pago:', err.message));
                    }

                    // Envió asíncrono de Correo Corporativo al dueño del local (Si tiene configurado email de destino)
                    const correoDestinoAdmin = tiendaDB.emailAdmin || tiendaDB.email;
                    if (correoDestinoAdmin) {
                        transporter.sendMail({
                            from: process.env.EMAIL_BACKEND,
                            to: correoDestinoAdmin,
                            subject: `🚨 Alerta de Pago: Nueva Transferencia en ${nombreRestaurante} 💰`,
                            text: textoEmail
                        }).then(() => {
                            console.log(`=== Correo de alerta enviado a: ${correoDestinoAdmin} ===`);
                        }).catch(emailError => {
                            console.error('Error enviando correo de alerta de pago:', emailError.message);
                        });
                    }
                }
            }
            // =========================================================================

        } catch (errorNotiAdmin) {
            console.error('Error enviando notificaciones al equipo administrativo:', errorNotiAdmin);
        }
        // =========================================================================

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
        const data_transferencia = await Transferencia.find({ tienda: tiendaid })
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