const { response } = require('express');
const Reservacion = require('../models/reservacion');
const Tienda = require('../models/tienda');
const mongoose = require('mongoose');
const PushSubscription = require('../models/push-subscription');
const { sendNotification } = require('../helpers/notificaciones');
const Usuario = require('../controllers/usuarios'); 

const getReservaciones = async(req, res) => {
    const reservaciones = await Reservacion.find()
    .sort({ createdAt: -1 });

    res.json({
        ok: true,
        reservaciones
    });
};

const getReservacion = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Reservacion.findById(id).populate('titulo img categoria')
        .exec((err, reservacion) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar reservacion',
                    errors: err
                });
            }
            if (!reservacion) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'La reservacion con el id ' + id + 'no existe',
                    errors: { message: 'No existe una reservacion con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                reservacion: reservacion
            });
        });

};



const crearReservacion = async (req, res) => {
    try {
        // Adaptamos las variables según las propiedades de tu esquema e input de Angular
        const { 
            local, 
            first_name, 
            last_name, 
            email, 
            telefono, 
            fecha, 
            hora, 
            personas, 
            comentarios,
            comensal_alergia,
            comentarios_alergia,
            listaespera 
        } = req.body;
        
        let uid = req.uid; // ID del usuario autenticado (si viene del middleware JWT)

        // 1. Buscar la tienda y comprobar si tiene las reservaciones activas
        const tienda = await Tienda.findById(local);
        
        if (!tienda) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La tienda no existe'
            });
        }

        if (!tienda.has_reservacion) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Este restaurante no tiene activado el servicio de reservaciones actualmente.'
            });
        }

        // =========================================================================
        // 🚀 NUEVA LÓGICA: INTERCEPCIÓN / CREACIÓN DE USUARIO EXPRESS
        // =========================================================================
        if (!uid) {
            // Creamos mocks para interceptar de manera limpia la respuesta del controlador de usuarios
            const mockReqUsuario = {
                body: {
                    first_name,
                    last_name,
                    email,
                    telefono,
                    role: 'CLIENTE_ROLE' // Rol por defecto si aplica en tu sistema
                }
            };

            const mockResUsuario = {
                statusCode: 200,
                status: function (code) {
                    this.statusCode = code;
                    return this;
                },
                json: function (data) {
                    this.responseData = data;
                    return this;
                }
            };

            try {
                // Invocamos la función del controlador de usuarios de forma asíncrona
                await Usuario.crearClienteExpress(mockReqUsuario, mockResUsuario);

                // Si la creación fue exitosa, extraemos el ID generado del usuario
                if (mockResUsuario.responseData && mockResUsuario.responseData.ok) {
                    // Ajusta 'usuario' o 'user' según la propiedad que devuelva tu controlador express
                    uid = mockResUsuario.responseData.usuario._id; 
                } else {
                    return res.status(mockResUsuario.statusCode).json({
                        ok: false,
                        mensaje: 'No se pudo procesar el registro del cliente express',
                        errors: mockResUsuario.responseData?.errors
                    });
                }
            } catch (errUsuario) {
                console.error('Error crítico al ejecutar crearUsuarioExpress:', errUsuario);
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error interno al intentar dar de alta al cliente',
                    errors: errUsuario
                });
            }
        }
        // =========================================================================

        // 2. Procedemos a crear el documento de la reserva con el ID final del usuario
        const nuevaReserva = new Reservacion({
            fecha,
            personas,
            hora,
            listaespera: listaespera || false,
            first_name,
            last_name,
            email,
            telefono,
            comensal_alergia: comensal_alergia || 'No',
            comentarios_alergia: comentarios_alergia || '',
            comentarios: comentarios || '',
            status: 'Pendiente', // Estado inicial por defecto
            local: local, // Llave de la relación con Tienda
            usuario: uid    // Guardamos la referencia del usuario creado o autenticado
        });

        const reservaGuardada = await nuevaReserva.save();

        res.status(201).json({
            ok: true,
            mensaje: 'Reserva creada exitosamente',
            reserva: reservaGuardada
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno en el servidor al crear la reserva',
            errors: error
        });
    }
};



const actualizarReservacion = async (req, res) => {
    const id = req.params.id;
    const { status, observaciones } = req.body;

    try {
        // 1. Buscamos la reservación original para conocer el estado previo y los datos del cliente
        const reservacion = await Reservacion.findById(id);
        if (!reservacion) {
            return res.status(404).json({
                ok: false,
                msg: 'Reservacion no encontrada'
            });
        }

        // 2. Validación crítica: Si el nuevo estado es Cancelada, exigimos observaciones
        if (status === 'Cancelada' && (!observaciones || observaciones.trim() === '')) {
            return res.status(400).json({
                ok: false,
                msg: 'Es obligatorio incluir las observaciones o el motivo de la cancelación.'
            });
        }

        const antiguoEstado = reservacion.status;
        const clienteId = reservacion.usuario; 

        // 3. Actualizamos el documento de forma segura usando object assignment y save()
        // Esto permite mantener consistencia y disparar hooks de Mongoose si los tuvieras
        Object.assign(reservacion, req.body);
        
        // Si viene observaciones (especialmente en cancelaciones), las guardamos
        if (observaciones) {
            reservacion.observaciones = observaciones;
        }

        if (status !== undefined && status !== antiguoEstado) {
            reservacion.updatedAt = new Date();
        }

        const reservacionActualizada = await reservacion.save();

        // =========================================================================
        // 🚀 DISPARO CENTRALIZADO DE NOTIFICACIÓN HYBRIDA PARA RESERVACIONES
        // =========================================================================
        if (status !== undefined && status !== antiguoEstado) {
            
            let tipoNotificacion = '';
            let titulo = '';
            let mensaje = '';

            // Mapeamos los estados según los ENUMs de tu notificacionSchema
            switch (status) {
                case 'Confirmada':
                    tipoNotificacion = 'RESERVACION_CONFIRMADA';
                    titulo = '¡Reservación Confirmada! 🎉';
                    mensaje = `Tu reservación para el día ${reservacionActualizada.fecha.toLocaleDateString()} a las ${reservacionActualizada.hora} ha sido aceptada. ¡Te esperamos!`;
                    break;
                    
                case 'Cancelada':
                    tipoNotificacion = 'RESERVACION_CANCELADA';
                    titulo = 'Reservación Cancelada ❌';
                    mensaje = `Lamentamos informarte que tu reservación ha sido cancelada. Motivo: ${observaciones}`;
                    break;
                    
                case 'Completada':
                    tipoNotificacion = 'RESERVACION_COMPLETADA';
                    titulo = '¡Gracias por visitarnos! 🍽️';
                    mensaje = 'Tu reservación ha finalizado. Esperamos que hayas disfrutado de tu experiencia.';
                    break;
            }

            // Si el estado no coincide con ninguno de estos tres, no se gatilla la alerta
            if (tipoNotificacion) {
                const urlRedireccion = `/mis-reservaciones`;

                // Buscamos las suscripciones Push del cliente utilizando su ID
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
                            reservacionActualizada._id // Pasa como referenciaId
                        ).catch(err => {
                            // Limpieza automática si la suscripción expiró o ya no es válida
                            if (err.statusCode === 410 || err.statusCode === 404) {
                                s.deleteOne().catch(e => console.log('Error eliminando sub', e));
                            }
                        });
                    });
                } else {
                    // Si no tiene Push Web activo, se guarda directo en la BD para que lo vea en la app
                    await sendNotification(
                        null,
                        titulo,
                        mensaje,
                        urlRedireccion,
                        clienteId,
                        tipoNotificacion,
                        reservacionActualizada._id
                    );
                }
            }
        }
        // =========================================================================

        res.json({
            ok: true,
            reservacion: reservacionActualizada
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al actualizar reservacion, hable con el administrador'
        });
    }
};


const borrarReservacion = async(req, res) => {

    const id = req.params.id;

    try {

        const reservacion = await Reservacion.findById(id);
        if (!reservacion) {
            return res.status(500).json({
                ok: false,
                msg: 'reservacion no encontrada por el id'
            });
        }

        await Reservacion.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'reservacion eliminada'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};

const getReservacionesByLocal = async (req, res) => {
    const { localId } = req.params;

    try {
        // 🟢 1. Forzamos la conversión nativa a ObjectId
        const localObjectId = new mongoose.Types.ObjectId(localId);

        // 🟢 2. Buscamos de forma directa SIN usar .populate() para evitar que se cuelgue Express
        const reservaciones = await Reservacion.find({ local: localObjectId })
        .sort({ createdAt: -1 }).lean(); // lean() devuelve objetos JS simples, no documentos Mongoose

        return res.json({
            ok: true,
            reservaciones
        });

    } catch (error) {
        console.error('-> API ERROR CRÍTICO:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Error en el servidor al cargar reservaciones por local'
        });
    }
};




const find_Reservacionesby_userid = (req, res) => {
    var id = req.params['id'];
    const page = parseInt(req.query.page) || 1;
    const limit = 4; // Tu límite actual
    const skip = (page - 1) * limit; // Cuántos posts saltar

    Reservacion.find({ user: id })
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
                    reservaciones: data
                });
            } else {
                res.status(404).send({ ok: false, reservaciones: [] });
            }
        });
}



module.exports = {
    getReservaciones,
    crearReservacion,
    actualizarReservacion,
    borrarReservacion,
    getReservacion,
    find_Reservacionesby_userid,
    getReservacionesByLocal,


};