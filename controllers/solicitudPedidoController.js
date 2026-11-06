const { response } = require('express');
const mongoose = require('mongoose');
const Solicitud = require('../models/solictudPedido');
const PushSubscription = require('../models/push-subscription');
const { sendNotification } = require('../helpers/notificaciones');

const getSolicitudes = async (req, res) => {

    const solicitudes = await Solicitud.find()

    res.json({
        ok: true,
        solicitudes
    });
};

const getSolicitud = async (req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Solicitud.findById(id, {})
        .populate('usuario')
        .exec((err, solicitud) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar solicitud',
                    errors: err
                });
            }
            if (!solicitud) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El solicitud con el id ' + id + 'no existe',
                    errors: { message: 'No existe un solicitud con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                solicitud: solicitud
            });
        });

};

const crearSolicitud = async (req, res) => {
    //  Usamos 'let' en lugar de 'const' para poder reasignarlo
    let uid = req.uid; 

   
    const solicitud = new Solicitud({
        tienda: req.body.tienda, // Amarrado al local
        usuario: uid,            // Profesional que lo atiende
        ...req.body,
    });

    try {
        const solicitudDB = await solicitud.save();

        // --- ENVIAR NOTIFICACIÓN AL CLIENTE EN TIEMPO REAL ---
        if (solicitudDB.cliente) {

            const titulo = '📄 Nueva Cotización Gastronómica 🍕';
            const mensaje = `El restaurante ha generado una propuesta para tu evento. Reísala aquí.`;
            const rutaDestino = `/dashboard/productos/pedidos`; // Ruta en tu Angular

            // Buscamos las suscripciones push del cliente de destino
            const subs = await PushSubscription.find({ usuario: solicitudDB.cliente });

            if (subs.length > 0) {
                // Disparo masivo a dispositivos (Maneja Push + Socket + Historial automáticamente)
                subs.forEach(s => {
                    sendNotification(
                        s.subscription,
                        titulo,
                        mensaje,
                        rutaDestino,
                        solicitudDB.cliente,
                        'NUEVA_SOLICITUD',
                        solicitudDB._id
                    ).catch(err => { if (err.statusCode === 410) s.deleteOne(); });
                });
            } else {
                // 💡 TU SALVAVIDAS IPHONE: Activa el WebSocket e inserta en el historial de Mongo
                await sendNotification(
                    null,
                    titulo,
                    mensaje,
                    rutaDestino,
                    solicitudDB.cliente,
                    'NUEVA_SOLICITUD',
                    solicitudDB._id
                );
            }
        }
        // -----------------------------------------------------

        // 🚨 Control de memoria Render: 'return' explícito obligatorio
        return res.json({
            ok: true,
            solicitud: solicitudDB
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador... revisar logs'
        });
    }
};


const actualizarSolicitud = async (req, res) => {
    const id = req.params.id;
    const uid = req.uid; // ID del Administrador que está haciendo la modificación

    try {
        const solicitud = await Solicitud.findById(id);
        if (!solicitud) {
            return res.status(404).json({
                ok: false,
                msg: 'Solicitud de catering no encontrada por el ID'
            });
        }

        const cambiosSolicitud = {
            ...req.body,
            usuario: uid // Registramos al administrador que hizo los cambios en el presupuesto
        }

        const solicitudActualizada = await Presupuesto.findByIdAndUpdate(id, cambiosSolicitud, { new: true });

        // ========================================================
        // 🔔 NOTIFICAR AL CLIENTE SOBRE LA ACTUALIZACIÓN EN VIVO
        // ========================================================
        if (solicitudActualizada.cliente) {

            const tituloNotif = '📝 Cotización de Banquete Modificada 🍕';
            const mensajeNotif = `El local ha realizado modificaciones en tu Solicitud de producto. Por favor, revísalo.`;
            const tipoNotif = 'SOLICITUD_ACTUALIZADO';
            const rutaDestino = `/mis-solicitudes`;

            // Buscamos si el cliente tiene canales de Web Push tradicionales
            const subs = await PushSubscription.find({ usuario: solicitudActualizada.cliente });

            if (subs.length > 0) {
                // Envío masivo a sus dispositivos (Maneja Push + Socket + Historial BD automáticamente)
                subs.forEach(s => {
                    sendNotification(
                        s.subscription,
                        tituloNotif,
                        mensajeNotif,
                        rutaDestino,
                        solicitudActualizada.cliente,
                        tipoNotif,
                        solicitudActualizada._id
                    ).catch(err => { if (err.statusCode === 410) s.deleteOne(); });
                });
            } else {
                // 💡 CASO IPHONE 6S (SOCKET + HISTORIAL BD DIRECTO AL CLIENTE)
                await sendNotification(
                    null,
                    tituloNotif,
                    mensajeNotif,
                    rutaDestino,
                    solicitudActualizada.cliente,
                    tipoNotif,
                    solicitudActualizada._id
                );
            }
        }
        // ========================================================

        // 🚨 Control estricto de memoria para blindar el plan básico de Render
        return res.json({
            ok: true,
            solicitudActualizada
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error interno en el servidor, hable con el administrador... revisar logs'
        });
    }
};


const borrarSolicitud = async (req, res) => {

    const id = req.params.id;

    try {

        const solicitud = await Solicitud.findById(id);
        if (!solicitud) {
            return res.status(500).json({
                ok: false,
                msg: 'solicitud no encontrado por el id'
            });
        }

        await Solicitud.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'solicitud eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};

const listarSolicitudPorUsuario = (req, res) => {
    var id = req.params['id'];
        Solicitud.find({ user: id }, (err, solicitudes) => {
            if (!err) {
                if (solicitudes) {
                    res.status(200).send({ solicitudes: solicitudes });
                } else {
                    res.status(500).send({ error: err });
                }
            } else {
                res.status(500).send({ error: err });
            }
        })
            .sort({ createdAt: - 1 });
}


const updateStatusSolicitud = async (req, res) => {
    const id = req.params['id'];
    const { status, observaciones } = req.body;

    // Mantenemos tus mismos ENUMs limpios de negocio
    const estadosValidos = ['APROVED', 'PENDING', 'REFUSED'];

    // 1. Validar que venga un estado y que esté dentro de la lista permitida
    if (!status || !estadosValidos.includes(status.toUpperCase())) {
        return res.status(400).json({
            ok: false,
            message: `El estado enviado no es válido. Valores permitidos: ${estadosValidos.join(', ')}`
        });
    }

    const estadoFormateado = status.toUpperCase();

    // 2. Validación obligatoria para rechazos gastronómicos
    if (estadoFormateado === 'REFUSED' && (!observaciones || observaciones.trim() === '')) {
        return res.status(400).json({
            ok: false,
            message: 'Las observaciones son obligatorias cuando la cotización es rechazada (REFUSED).'
        });
    }

    try {
        // 3. Crear el objeto con los datos a actualizar
        const camposAActualizar = {
            status: estadoFormateado
        };

        if (estadoFormateado === 'REFUSED' || observaciones) {
            camposAActualizar.observaciones = observaciones;
        } else {
            camposAActualizar.observaciones = null;
        }

        // 4. Actualizar la cotización en la Base de Datos de Zlipmenu
        // Hacemos populate del usuario administrativo del local que atiende el banquete
        const solicitud_data = await Solicitud.findByIdAndUpdate(
            id,
            camposAActualizar,
            { new: true }
        ).populate('usuario', 'username email role');

        if (!solicitud_data) {
            return res.status(404).json({ ok: false, message: 'No se encontró la cotización especificada.' });
        }

        // 💡 OMITIMOS NOTIFICACIÓN SI PASA A "PENDING" (Solo notificamos Aprobación o Rechazo al restaurante)
        if (estadoFormateado === 'APROVED' || estadoFormateado === 'REFUSED') {

            // 5. Configurar Notificación Dinámica
            const esAprobado = estadoFormateado === 'APROVED';
            const tituloNotif = esAprobado ? '✅ Producto Aprobado 🎉' : '❌ Producto Rechazada';
            const tipoNotif = esAprobado ? 'SOLICITUD_APROBADO' : 'SOLICITUD_RECHAZADO';

            const nombreCotizacion = cotizacion_data.title || 'de Catering';

            const mensajeNotif = esAprobado
                ? `El cliente ha aprobado la cotización "${nombreCotizacion}". ¡A preparar el producto!`
                : `El cliente ha rechazado la propuesta del producto. Motivo: ${observaciones}`;

            const rutaDestino = `/dashboard/productos/pedidos`; // Ruta para el administrador en Angular

            // El destinatario de la alerta siempre es el administrador/usuario que armó la propuesta
            const administradorId = solicitud_data.usuario._id || solicitud_data.usuario;

            // 6. DISPARO HÍBRIDO CON TU MOTOR DE CONFIANZA (BD + Sockets + Push)
            const subs = await PushSubscription.find({ usuario: administradorId });

            if (subs.length > 0) {
                subs.forEach(s => {
                    sendNotification(
                        s.subscription,
                        tituloNotif,
                        mensajeNotif,
                        rutaDestino,
                        administradorId,
                        tipoNotif,
                        solicitud_data._id
                    ).catch(err => { if (err.statusCode === 410) s.deleteOne(); });
                });
            } else {
                // Caso iPhone 6s: Al no tener push, inyecta directo el WebSocket y guarda historial en Mongo
                await sendNotification(
                    null,
                    tituloNotif,
                    mensajeNotif,
                    rutaDestino,
                    administradorId,
                    tipoNotif,
                    solicitud_data._id
                );
            }
        }

        // 7. RESPUESTA HTTP ÚNICA Y COMPATIBLE
        return res.status(200).json({
            ok: true,
            msg: estadoFormateado === 'APROVED' ? 'Solicitud aprobada con éxito' : 'Solicitud rechazada',
            solicitud: solicitud_data
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ ok: false, message: 'Error en el servidor al actualizar el estado de la cotización' });
    }
}

const listarSolicitudoByLocal = async (req, res) => {
    var id = req.params['id'];
        try {
            const solicitudes = await Solicitud.find({ tienda: id })
                .populate('user', 'first_name last_name email telefono numdoc')
                .populate('tienda', 'nombre slug categorias subcategoria')
                .sort({ createdAt: -1 });
    
            res.status(200).send({ solicitudes: solicitudes });
        } catch (err) {
            res.status(500).send({ error: err });
        }
};


module.exports = {
    getSolicitudes,
    getSolicitud,
    crearSolicitud,
    actualizarSolicitud,
    borrarSolicitud,
    listarSolicitudPorUsuario,
    updateStatusSolicitud,
    listarSolicitudoByLocal


};