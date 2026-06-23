const { response } = require('express');
const mongoose = require('mongoose');
const Presupuesto = require('../models/presupuesto');
const PushSubscription = require('../models/push-subscription');
const { sendNotification } = require('../helpers/notificaciones');
const getPresupuestos = async (req, res) => {

    const presupuestos = await Presupuesto.find({})
        .populate('usuario')

    res.json({
        ok: true,
        presupuestos
    });
};

const getPresupuesto = async (req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Presupuesto.findById(id, {})
        .populate('usuario')
        .exec((err, presupuesto) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar presupuesto',
                    errors: err
                });
            }
            if (!presupuesto) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El presupuesto con el id ' + id + 'no existe',
                    errors: { message: 'No existe un presupuesto con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                presupuesto: presupuesto
            });
        });

};
const crearCotizacionCatering = async (req, res) => {
    // 1. ID del Administrador del restaurante que genera o aprueba la propuesta
    const uid = req.uid; 

    const cotizacion = new CotizacionCatering({
        tienda: req.body.tienda, // Amarrado al local
        usuario: uid,            // Profesional que lo atiende
        ...req.body,
    });

    try {
        const cotizacionDB = await cotizacion.save();

        // --- ENVIAR NOTIFICACIÓN AL CLIENTE EN TIEMPO REAL ---
        if (cotizacionDB.cliente) {
            
            const titulo = '📄 Nueva Cotización Gastronómica 🍕';
            const mensaje = `El restaurante ha generado una propuesta para tu evento. Reísala aquí.`;
            const rutaDestino = `/dashboard/catering/mis-cotizaciones`; // Ruta en tu Angular

            // Buscamos las suscripciones push del cliente de destino
            const subs = await PushSubscription.find({ usuario: cotizacionDB.cliente });

            if (subs.length > 0) {
                // Disparo masivo a dispositivos (Maneja Push + Socket + Historial automáticamente)
                subs.forEach(s => {
                    sendNotification(
                        s.subscription, 
                        titulo, 
                        mensaje, 
                        rutaDestino, 
                        cotizacionDB.cliente, 
                        'NUEVA_COTIZACION', 
                        cotizacionDB._id
                    ).catch(err => { if (err.statusCode === 410) s.deleteOne(); });
                });
            } else {
                // 💡 TU SALVAVIDAS IPHONE: Activa el WebSocket e inserta en el historial de Mongo
                await sendNotification(
                    null, 
                    titulo, 
                    mensaje, 
                    rutaDestino, 
                    cotizacionDB.cliente, 
                    'NUEVA_COTIZACION', 
                    cotizacionDB._id
                );
            }
        }
        // -----------------------------------------------------

        // 🚨 Control de memoria Render: 'return' explícito obligatorio
        return res.json({
            ok: true,
            cotizacion: cotizacionDB
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador... revisar logs'
        });
    }
};


const actualizarCotizacionCatering = async (req, res) => {
    const id = req.params.id;
    const uid = req.uid; // ID del Administrador que está haciendo la modificación

    try {
        const cotizacion = await CotizacionCatering.findById(id);
        if (!cotizacion) {
            return res.status(404).json({
                ok: false,
                msg: 'Cotización de catering no encontrada por el ID'
            });
        }

        const cambiosCotizacion = {
            ...req.body,
            usuario: uid // Registramos al administrador que hizo los cambios en el presupuesto
        }

        const cotizacionActualizada = await CotizacionCatering.findByIdAndUpdate(id, cambiosCotizacion, { new: true });

        // ========================================================
        // 🔔 NOTIFICAR AL CLIENTE SOBRE LA ACTUALIZACIÓN EN VIVO
        // ========================================================
        if (cotizacionActualizada.cliente) {
            
            const tituloNotif = '📝 Cotización de Banquete Modificada 🍕';
            const mensajeNotif = `El restaurante ha realizado modificaciones en tu presupuesto de catering. Por favor, revísalo.`;
            const tipoNotif = 'PRESUPUESTO_ACTUALIZADO'; 
            const rutaDestino = `/mis-cotizaciones`;

            // Buscamos si el cliente tiene canales de Web Push tradicionales
            const subs = await PushSubscription.find({ usuario: cotizacionActualizada.cliente });

            if (subs.length > 0) {
                // Envío masivo a sus dispositivos (Maneja Push + Socket + Historial BD automáticamente)
                subs.forEach(s => {
                    sendNotification(
                        s.subscription, 
                        tituloNotif, 
                        mensajeNotif, 
                        rutaDestino, 
                        cotizacionActualizada.cliente, 
                        tipoNotif, 
                        cotizacionActualizada._id
                    ).catch(err => { if (err.statusCode === 410) s.deleteOne(); });
                });
            } else {
                // 💡 CASO IPHONE 6S (SOCKET + HISTORIAL BD DIRECTO AL CLIENTE)
                await sendNotification(
                    null, 
                    tituloNotif, 
                    mensajeNotif, 
                    rutaDestino, 
                    cotizacionActualizada.cliente, 
                    tipoNotif, 
                    cotizacionActualizada._id
                );
            }
        }
        // ========================================================

        // 🚨 Control estricto de memoria para blindar el plan básico de Render
        return res.json({
            ok: true,
            cotizacionActualizada
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error interno en el servidor, hable con el administrador... revisar logs'
        });
    }
};


const borrarPresupuesto = async (req, res) => {

    const id = req.params.id;

    try {

        const presupuesto = await Presupuesto.findById(id);
        if (!presupuesto) {
            return res.status(500).json({
                ok: false,
                msg: 'presupuesto no encontrado por el id'
            });
        }

        await Presupuesto.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'presupuesto eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};

const listarPresupuestoPorUsuario = (req, res) => {
    var id = req.params['id'];
    const page = parseInt(req.query.page) || 1;
    const limit = 4; // Tu límite actual
    const skip = (page - 1) * limit; // Cuántos posts saltar

    Presupuesto.find({ usuario: id })
        .populate('cliente', 'email uid username')
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
                    presupuestos: data
                });
            } else {
                res.status(404).send({ ok: false, presupuestos: [] });
            }
        });
}


const updateStatusCotizacionCatering = async (req, res) => {
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
        const cotizacion_data = await CotizacionCatering.findByIdAndUpdate(
            id,
            camposAActualizar,      
            { new: true }           
        ).populate('usuario', 'username email role');

        if (!cotizacion_data) {
            return res.status(404).json({ ok: false, message: 'No se encontró la cotización especificada.' });
        }

        // 💡 OMITIMOS NOTIFICACIÓN SI PASA A "PENDING" (Solo notificamos Aprobación o Rechazo al restaurante)
        if (estadoFormateado === 'APROVED' || estadoFormateado === 'REFUSED') {
            
            // 5. Configurar Notificación Dinámica
            const esAprobado = estadoFormateado === 'APROVED';
            const tituloNotif = esAprobado ? '✅ Banquete Aprobado 🎉' : '❌ Cotización Rechazada';
            const tipoNotif = esAprobado ? 'PRESUPUESTO_APROBADO' : 'PRESUPUESTO_RECHAZADO';

            const nombreCotizacion = cotizacion_data.title || 'de Catering';

            const mensajeNotif = esAprobado
                ? `El cliente ha aprobado la cotización "${nombreCotizacion}". ¡A preparar la cocina!`
                : `El cliente ha rechazado la propuesta de banquete. Motivo: ${observaciones}`;

            const rutaDestino = `/dashboard/catering/pedidos`; // Ruta para el administrador en Angular
            
            // El destinatario de la alerta siempre es el administrador/usuario que armó la propuesta
            const administradorId = cotizacion_data.usuario._id || cotizacion_data.usuario;

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
                        cotizacion_data._id
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
                    cotizacion_data._id
                );
            }
        }

        // 7. RESPUESTA HTTP ÚNICA Y COMPATIBLE
        return res.status(200).json({
            ok: true,
            msg: estadoFormateado === 'APROVED' ? 'Cotización aprobada con éxito' : 'Cotización rechazada',
            cotizacion: cotizacion_data
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ ok: false, message: 'Error en el servidor al actualizar el estado de la cotización' });
    }
}

const listarPresupuestoByLocal = async (req, res) => {
    const { localId } = req.params;

    try {
        // 🟢 1. Forzamos la conversión nativa a ObjectId
        const localObjectId = new mongoose.Types.ObjectId(localId);

        // 🟢 2. Buscamos de forma directa SIN usar .populate() para evitar que se cuelgue Express
        const presupuestos = await Presupuesto.find({ tienda: localObjectId })
            .sort({ createdAt: -1 }).lean(); // lean() devuelve objetos JS simples, no documentos Mongoose

        return res.json({
            ok: true,
            presupuestos
        });

    } catch (error) {
        console.error('-> API ERROR CRÍTICO:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Error en el servidor al cargar presupuestos por local'
        });
    }
};



module.exports = {
    getPresupuestos,
    getPresupuesto,
    crearCotizacionCatering,
    actualizarCotizacionCatering,
    borrarPresupuesto,
    listarPresupuestoPorUsuario,
    listarPresupuestoByLocal,
    updateStatusCotizacionCatering


};