const { response } = require('express');
const Venta = require('../models/venta');
const Tienda = require('../models/tienda');
var Detalle = require('../models/detalle');
var Cancelacion = require('../models/cancelacion');

const { io } = require('../index');
const ProductoController = require('./productoController');

// importamos nodemailer, agregado por José Prados
const nodemailer = require('nodemailer');
// confirguramos el tarnsporter de nodemailer
const transporter = nodemailer.createTransport({
    host: process.env.HOST_EMAIL, // smtp.gmail.com
    port: process.env.PORT_EMAIL,
    secure: true, // true para puerto 465 (SSL)
    auth: {
        user: process.env.USER_EMAIL, // soporte@zlipmenu.com
        pass: process.env.PASS_email  // Tu contraseña real o de app
    },
    tls: {
        // Esto evita errores si el certificado SSL del servidor es autofirmado
        rejectUnauthorized: false
    }
});


const getVentas = async (req, res) => {

    const ventas = await Venta.find();

    res.json({
        ok: true,
        ventas
    });
};

const getVenta = async (req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Venta.findById(id)
        .exec((err, venta) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar Venta',
                    errors: err
                });
            }
            if (!venta) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El Venta con el id ' + id + 'no existe',
                    errors: { message: 'No existe un Venta con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                venta: venta
            });
        });

};


function registro(req, res) {
    let data = req.body;

    var mydate = new Date();

    var venta = new Venta();
    venta.user = data.user;
    venta.local = data.local;
    venta.total_pagado = data.total_pagado;
    venta.codigo_cupon = data.codigo_cupon;
    venta.info_cupon = data.info_cupon;
    venta.idtransaccion = data.idtransaccion;
    venta.metodo_pago = data.metodo_pago;

    venta.precio_envio = data.precio_envio;
    venta.tipo_envio = data.tipo_envio;
    venta.tiempo_estimado = data.tiempo_estimado;

    venta.direccion = data.direccion;
    venta.destinatario = data.destinatario;
    venta.referencia = data.referencia;
    venta.pais = data.pais;
    venta.zip = data.zip;
    venta.ciudad = data.ciudad;
    venta.tracking_number = null;

    venta.day = mydate.getDate();
    venta.month = mydate.getMonth() + 1;
    venta.year = mydate.getFullYear();

    venta.estado = 'Venta en proceso';

    venta.save(async (err, venta_save) => {
        if (!err) {
            if (venta_save) {
                var detalle = data.detalles;
                // console.log(detalle);
                for (const element of detalle) {
                    var detalleveta = new Detalle();
                    detalleveta.user = data.user;
                    detalleveta.local = data.local;
                    detalleveta.venta = venta_save._id;
                    detalleveta.producto = element.producto;
                    detalleveta.cantidad = element.cantidad;
                    detalleveta.precio = element.precio;
                    detalleveta.color = element.color;
                    detalleveta.selector = element.selector;

                    await detalleveta.save();

                    // Reduce stock for the product
                    await ProductoController.reducir_stock_internal(element.producto, element.cantidad);

                    // Emit socket event for stock update
                    io.emit('stock-updated', { productoId: element.producto, cantidad: element.cantidad });
                }
                res.status(200).send({ message: "Registrado" });
            } else {
                res.status(403).send({ message: 'No se registro la venta, vuelva a intentar nuevamente.' });
            }
        } else {
            res.status(500).send({
                message: 'Ocurrió un error en el servidor.',
                error: err
            });
        }
    });
}

const actualizarVenta = async (req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const venta = await Venta.findById(id);
        if (!venta) {
            return res.status(500).json({
                ok: false,
                msg: 'venta no encontrado por el id'
            });
        }

        const cambiosVenta = {
            ...req.body,
            usuario: uid
        }

        const ventaActualizado = await Venta.findByIdAndUpdate(id, cambiosVenta, { new: true });

        res.json({
            ok: true,
            ventaActualizado
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};

const borrarVenta = async (req, res) => {

    const id = req.params.id;

    try {

        const galeria = await Venta.findById(id);
        if (!galeria) {
            return res.status(500).json({
                ok: false,
                msg: 'Venta no encontrado por el id'
            });
        }

        await Venta.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'Venta eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};


function data_detalle(req, res) {
    var id = req.params['id'];
    Venta.findById({ _id: id }).populate('user').exec((err, data_venta) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (data_venta) {


                Detalle.find({ venta: data_venta._id }).populate('producto').exec((err, data_detalle) => {
                    if (!err) {
                        if (data_detalle) {
                            res.status(200).send({
                                venta: data_venta,
                                detalle: data_detalle
                            });
                        } else {
                            res.status(500).send({ error: err });
                        }
                    } else {
                        res.status(500).send({ error: err });
                    }
                });
            }
        }
    });
}


const listarVentaPorUsuario = (req, res) => {
    var id = req.params['id'];

    Venta.find({ user: id }).sort({ createdAt: -1 }).exec((err, data_venta) => {
        if (!err) {
            if (data_venta) {
                // res.status(200).send({ ventas: data_venta });
                //paginamos el resultado de 10 en 10
                res.status(200).send({ ventas: data_venta.slice(0, 10) });
            } else {
                res.status(500).send({ error: err });
            }
        } else {
            res.status(500).send({ error: err });
        }
    });
}


//Cancelaciones
const getCancelacion = async (req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Cancelacion.findById(id)
        .exec((err, cancelacion) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar cancelacion',
                    errors: err
                });
            }
            if (!cancelacion) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El cancelacion con el id ' + id + 'no existe',
                    errors: { message: 'No existe un cancelacion con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                cancelacion: cancelacion
            });
        });

};

function evaluar_cancelacion(req, res) {
    const id = req.params.id;
    // var id = req.params['id'];
    Cancelacion.find({ venta: id }, (err, solicitud) => {
        if (solicitud.length != 0) {
            res.status(200).send({ data: true });
        } else {
            res.status(200).send({ data: false });
        }
    })

}

function cancelar(req, res) {
    var data = req.body;

    var cancelacion = new Cancelacion();
    cancelacion.mensaje = data.mensaje,
        cancelacion.estado = 'En espera',
        cancelacion.user = data.user,
        cancelacion.venta = data.venta,

        cancelacion.save((err, data_soli) => {
            if (err) {
                res.status(500).send({ message: err });
            } else {
                if (data_soli) {
                    Venta.findByIdAndUpdate({ _id: data.venta }, { estado: 'Cancelado' }, (err, venta_data) => {
                        if (venta_data) {
                            res.status(200).send({ venta: venta_data });
                        } else {
                            res.status(500).send({ error: err });
                        }
                    })
                }
            }
        });
}

function listar_cancelaciones(req, res) {
    var wr = req.params['wr'];

    if (wr) {
        Cancelacion.find({ estado: wr }).populate('user').populate('venta').sort({ createdAt: -1 }).exec((err, data_cancelaciones) => {
            if (data_cancelaciones) {
                res.status(200).send({ cancelaciones: data_cancelaciones });
            }
        });
    } else {
        Cancelacion.find().populate('user').populate('venta').sort({ createdAt: -1 }).exec((err, data_cancelaciones) => {
            if (data_cancelaciones) {
                res.status(200).send({ cancelaciones: data_cancelaciones });
            }
        });
    }
}

function obtener_data_cancelacion(req, res) {
    var id = req.params['id'];

    Cancelacion.findOne({ venta: id }).populate('user').populate('venta').exec((err, data_cancelacion) => {
        if (!err) {
            if (data_cancelacion) {
                // console.log(data_cancelacion);
                res.status(200).send({ cancelacion: data_cancelacion });
            } else {

                res.status(500).send({ cancelacion: false });
            }
        } else {
            // console.log(err);
            res.status(500).send({ error: err });
        }
    });
}

const listarCancelacionPorUsuario = (req, res) => {
    var id = req.params['id'];
    Cancelacion.find({ user: id }).sort({ createdAt: -1 }).exec((err, data_cancelacion) => {
        if (!err) {
            if (data_cancelacion) {
                res.status(200).send({ cancelacion: data_cancelacion });
            } else {
                res.status(500).send({ error: err });
            }
        } else {
            res.status(500).send({ error: err });
        }
    });
}


//admin

function init_data_admin(req, res) {
    Venta.find().sort({ createdAt: -1 }).populate('user').populate('local').exec((err, data) => {
        if (data) {
            res.status(200).send({ data: data });
        }
    });
}
function init_data_admin_local(req, res) {
    var localid = req.params['localid'];
    Venta.find({ local: localid }).sort({ createdAt: -1 })
        .populate('user')
        .populate('local')
        .exec((err, data) => {
            if (data) {
                res.status(200).send({ data: data });
            }
        });
}

function listar_admin(req, res) {
    var tipo = req.params['tipo'];
    var search = req.params['search'];
    var orden = req.params['orden'];

    if (tipo == 'null' && search == 'null') {
        // console.log(orden);

        if (orden == 'fecha+') {
            Venta.find().sort({ createdAt: -1 }).populate('user').exec((err, data) => {
                if (data) {
                    res.status(200).send({ data: data });
                }
            });
        } else if (orden == 'fecha-') {
            Venta.find().sort({ createdAt: 1 }).populate('user').exec((err, data) => {
                if (data) {
                    res.status(200).send({ data: data });
                }
            });
        } else if (orden == 'pagado+') {
            Venta.find().sort({ total_pagado: -1 }).populate('user').exec((err, data) => {
                if (data) {
                    res.status(200).send({ data: data });
                }
            });
        } else if (orden == 'pagado-') {
            Venta.find().sort({ total_pagado: 1 }).populate('user').exec((err, data) => {
                if (data) {
                    res.status(200).send({ data: data });
                }
            });
        } else if (orden == 'null') {
            Venta.find().sort({ createdAt: -1 }).populate('user').exec((err, data) => {
                if (data) {
                    res.status(200).send({ data: data });
                }
            });
        }
    } else {
        console.log('filtro');
        if (tipo == 'fecha') {
            let data = search.split('-');
            var dia;
            var mes;
            if (data[1] == 0) {
                dia = ''
            } else {
                dia = data[1];
            }
            if (data[2] == 0) {
                mes = ''
            } else {
                mes = data[2];
            }
            if (orden == 'fecha+') {
                Venta.find({ year: data[0], day: new RegExp(dia, 'i'), month: new RegExp(mes, 'i') }).populate('user').sort({ createdAt: -1 }).exec((err, data) => {
                    if (data) {
                        res.status(200).send({ data: data });
                    }
                });
            } else if (orden == 'fecha-') {
                Venta.find({ year: data[0], day: new RegExp(dia, 'i'), month: new RegExp(mes, 'i') }).populate('user').sort({ createdAt: 1 }).exec((err, data) => {
                    if (data) {
                        res.status(200).send({ data: data });
                    }
                });
            }
            if (orden == 'pagado+') {
                Venta.find({ year: data[0], day: new RegExp(dia, 'i'), month: new RegExp(mes, 'i') }).populate('user').sort({ total_pagado: -1 }).exec((err, data) => {
                    if (data) {
                        res.status(200).send({ data: data });
                    }
                });
            }
            if (orden == 'pagado-') {
                Venta.find({ year: data[0], day: new RegExp(dia, 'i'), month: new RegExp(mes, 'i') }).populate('user').sort({ total_pagado: 1 }).exec((err, data) => {
                    if (data) {
                        res.status(200).send({ data: data });
                    }
                });
            }

        } else if (tipo == 'estado') {
            if (orden == 'fecha+') {
                Venta.find({ estado: search }).sort({ createdAt: -1 }).populate('user').exec((err, data) => {
                    if (data) {
                        res.status(200).send({ data: data });
                    }
                });
            } else if (orden == 'fecha-') {
                Venta.find({ estado: search }).sort({ createdAt: 1 }).populate('user').exec((err, data) => {
                    if (data) {
                        res.status(200).send({ data: data });
                    }
                });
            }
            if (orden == 'pagado+') {
                Venta.find({ estado: search }).sort({ total_pagado: -1 }).populate('user').exec((err, data) => {
                    if (data) {
                        res.status(200).send({ data: data });
                    }
                });
            }
            if (orden == 'pagado-') {
                Venta.find({ estado: search }).sort({ total_pagado: 1 }).populate('user').exec((err, data) => {
                    if (data) {
                        res.status(200).send({ data: data });
                    }
                });
            }
        } else if (tipo == 'codigo') {
            Venta.find({ _id: search }).populate('user').exec((err, data) => {
                res.status(200).send({ data: data });
            });
        }
    }
}

//otros



function finalizar(req, res) {
    var id = req.params['id'];
    Venta.findByIdAndUpdate({ _id: id }, { estado: 'Finalizado' }, (err, venta_data) => {
        if (venta_data) {
            res.status(200).send({ venta: venta_data });
        } else {
            res.status(500).send({ error: err });
        }
    })
}


function evaluar_orden_coment(req, res) {
    var user = req.params['user'];
    var producto = req.params['producto'];

    Detalle.find({ user: user, producto: producto }).exec((err, data) => {

        if (data.length != 0) {
            res.status(200).send({ data: true });
        } else {
            res.status(200).send({ data: false });
        }
    });
}

function get_solicitud(req, res) {
    var id = req.params['id'];
    Cancelacion.findById({ _id: id }).populate('user').populate('venta').exec((err, data_cancelacion) => {
        if (data_cancelacion) {
            res.status(200).send({ cancelacion: data_cancelacion });
        }
    });
}

function set_track(req, res) {
    var id = req.params['id'];
    var data = req.body;
    Venta.findByIdAndUpdate({ _id: id }, { tracking_number: data.tracking_number, estado: 'Enviado' }, (err, venta_data) => {
        if (venta_data) {
            res.status(200).send({ venta: venta_data });
        } else {
            res.status(500).send({ error: err });
        }
    })
}

function update_enviado(req, res) {
    var id = req.params['id'];
    Venta.findByIdAndUpdate({ _id: id }, { estado: 'Enviado' }, (err, venta_data) => {
        if (venta_data) {
            res.status(200).send({ venta: venta_data });
        } else {
            res.status(500).send({ error: err });
        }
    })
}

function listar_ventas_dashboard(req, res) {
    Venta.find().exec((err, data) => {
        if (data) {
            // console.log(data);
            res.status(200).send({ data: data });
        }
    });
}
function listar_ventas_dashboard_local(req, res) {
    const id = req.params.id;
    Venta.find({ local: id }).exec((err, data) => {
        if (data) {
            // console.log(data);
            res.status(200).send({ data: data });
        }
    });
}

function listar_ventas_Year(req, res) {
    const year = req.params.year;

    let query = {};
    if (year) {
        query.year = year;
    }

    Venta.find(query).sort({ createdAt: -1 }).exec((err, data) => {
        if (data) {
            res.status(200).send({ data: data });
        } else {
            res.status(500).send({ error: err });
        }
    });
}

function detalles_hoy(req, res) {
    var mydate = new Date();

    Detalle.find().sort({ _id: -1 }).populate('producto').limit(10).exec((err, data) => {
        if (data) {
            res.status(200).send({ data: data });
        }
    });
}

function detalles_hoy_local(req, res) {
    const id = req.params.id;
    var mongoose = require('mongoose');

    Detalle.aggregate([
        {
            $lookup: {
                from: 'productos',
                localField: 'producto',
                foreignField: '_id',
                as: 'producto'
            }
        },
        { $unwind: '$producto' },
        { $match: { 'producto.local': mongoose.Types.ObjectId(id) } },
        { $sort: { _id: -1 } },
        { $limit: 10 }
    ]).exec((err, data) => {
        if (data) {
            res.status(200).send({ data: data });
        }
    });
}

function denegar(req, res) {
    var id = req.params['id'];
    var idticket = req.params['idticket'];
    Venta.findByIdAndUpdate({ _id: id }, { estado: 'Venta en proceso' }, (err, venta_data) => {
        if (venta_data) {
            Cancelacion.findByIdAndUpdate({ _id: idticket }, { estado: 'Denegado' }, (err, venta_data) => {
                if (venta_data) {
                    res.status(200).send({ venta_data: venta_data });
                } else {
                    res.status(500).send({ error: err });
                }
            })
        } else {
            res.status(500).send({ error: err });
        }
    })
}


// enviar factura al cliente, agregado por José Prados
function enviarFactura(req, res) {
    // Verifica que se recibió el archivo
    if (!req.file) {
        return res.status(400).json({
            ok: false,
            message: 'No se recibió ningún archivo'
        });
    }

    // Configurar el correo con el archivo recibido
    const texto = `Hola ${req.body.nombrecliente}! Adjunto encontraras la factura de tu compra.`;
    const mailOptions = {
        from: `"Soporte ZlipMenu" <${process.env.USER_EMAIL}>`,
        to: req.body.emailcliente,
        subject: `¡Hola ${req.body.nombrecliente}! Te enviamos la factura de tu compra`,
        text: texto,
        attachments: [
            {
                filename: req.file.originalname,
                content: req.file.buffer,
            },
        ],
    };

    // enviar email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error al enviar el correo:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al enviar el correo, verifique el email del cliente por favor'
            });
        }
        else {
            console.log('Correo enviado: ' + info.response);
            res.json({
                ok: true,
                message: 'Correo enviado con éxito'
            });
        }
    })

    // enviarWhatsappSencillo()
    // enviarSMS()
}

//fin enviar factura

//envio de sms y whatsapp
// function enviarWhatsappSencillo(){
//      // Configurar el correo con el archivo recibido
//     const texto = `Hola ${req.body.nombrecliente}! Adjunto encontraras la factura de tu compra.`;
//     <a
//                     href="https://wa.me/{{tienda.telefono}}?text=Haz%20recibido%20una%20compra%20{{randomNum}}%20,%20favor%20verifica%20y,%20procesala%20pronto%20!"
//                     target="_blank" rel="noopener noreferrer">
//                     Notificar a la tienda
//                     </a>


// }
// function enviarWhatSMS(){
//      // Configurar el correo con el archivo recibido
//     const texto = `Hola ${req.body.nombrecliente}! Adjunto encontraras la factura de tu compra.`;
//     const messageOptions = {
//         from: 'tu-email@gmail.com', //remitente
//         to: req.body.telefono, //destinatario: cliente en este caso
//         subject: `Hola ${req.body.nombrecliente}! Te enviamos la factura de tu compra`,
//         text: texto,
//         attachments: [
//           {
//             filename: req.file.originalname, // Nombre original del archivo
//             content: req.file.buffer, // Buffer en memoria
//           },
//         ],
//     };

// }


const ventasbyTiendaId = async (req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Venta.find({ local: id })
        .populate('local')
        .sort({ createdAt: -1 })
        .exec((err, ventas) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar ventas',
                    errors: err
                });
            }
            if (!ventas) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'La venta con el id ' + id + ' no existe',
                    errors: { message: 'No existe un ventas con ese id' }
                });

            }
            res.status(200).json({
                ok: true,
                ventas: ventas
            });
        });

};


function listar_ventas_Year_local(req, res) {
    const year = req.params.year;
    const id = req.params.id;
    let query = { local: id };

    if (year) {
        query.year = year;
    }

    Venta.find(query).sort({ createdAt: -1 }).exec((err, data) => {
        if (data) {
            res.status(200).send({ data: data });
        } else {
            res.status(500).send({ error: err });
        }
    });
}


module.exports = {
    getVentas,
    registro,
    actualizarVenta,
    borrarVenta,
    getVenta,
    data_detalle,
    finalizar,
    init_data_admin,
    evaluar_cancelacion,
    cancelar,
    listar_cancelaciones,
    get_solicitud,
    obtener_data_cancelacion,
    evaluar_orden_coment,
    denegar,
    listar_admin,
    set_track,
    update_enviado,
    listar_ventas_dashboard,
    listar_ventas_Year,
    detalles_hoy,
    detalles_hoy_local,
    listarVentaPorUsuario,
    listarCancelacionPorUsuario,
    getCancelacion,
    enviarFactura,
    ventasbyTiendaId,
    listar_ventas_Year_local,
    listar_ventas_dashboard_local,
    init_data_admin_local
};