const { response } = require('express');
const Tienda = require('../models/tienda');
const Venta = require('../models/venta');
const Driver = require('../models/driver');
const Asignacion = require('../models/asignardelivery');



const crearAsignacion = async(req, res) => {

    const { driver, status, tienda, venta } = req.body;

    const body = req.body;
    try {

        const existeDriver = await Driver.findById(body.driver);
       
        const existeTienda = await Tienda.findById(body.tienda);
        const existeVenta = await Venta.findById(body.venta);

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
        if (!existeVenta) {
            return res.status(400).json({
                ok: false,
                msg: 'La venta no existe'
            });
        }

        
        const asignacion = new Asignacion({
            driver: body.driver,
            tienda: body.tienda,
            venta: body.venta,
            status: body.status,
        });

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

const actualizarAsignacion = async(req, res) => {

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


const actualizarAsignacionCoord = async(req, res) => {

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

const getAsignacions = async(req, res) => {

    const asignacions = await Asignacion.find()
      

    res.json({
        ok: true,
        asignacions
    });
};
const getAsignacionsTienda = async(req, res) => {
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

const getAsignacion = async(req, res) => {

    const id = req.params.id;

    Asignacion.findById(id)
        .populate('driver')
        .populate('venta')
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


const borrarAsignacion = async(req, res) => {

    const id = req.params.id;

    try {

        const asignacion = await Asignacion.findById(id);
        if (!asignacion) {
            return res.status(500).json({
                ok: false,
                msg: 'asignacion no encontrado por el id'
            });
        }

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
    var id = req.params['id'];
    Asignacion.find({ driver: id }, (err, data_asignacion) => {
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
    .sort({createdAt: - 1});
}

const listarAsignacionPorUser = async(req, res) => {
    var id = req.params['id'];
    try {
        // First find all ventas for this user
        const ventas = await Venta.find({ user: id });
        const ventaIds = ventas.map(v => v._id);
        
        // Then find assignments for these ventas
        Asignacion.find({ venta: { $in: ventaIds } }, (err, data_asignacion) => {
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
        .sort({createdAt: -1});
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

function entregado(req, res) {
    var id = req.params['id'];
    // console.log(id);
    Asignacion.findByIdAndUpdate({ _id: id }, 
        { status: 'Entregado' }, 
        { statusD: 'Entregado' }, 
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

function recibido(req, res) {
    var id = req.params['id'];
    // console.log(id);
    Asignacion.findByIdAndUpdate({ _id: id }, 
        { status: 'Confirmado' }, 
        { statusC: 'Recibido' }, 
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

const getAsignacionsByStatus = async(req, res) => {

    var id = req.params['id'];
    var status = req.params['status'];
    Asignacion.find({ driver: id, status: status }, (err, data_asignacion) => {
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
    .sort({createdAt: - 1});
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
    entregado,
    activar,
    recibido,
    getAsignacionsByStatus

};