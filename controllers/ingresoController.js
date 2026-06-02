const { response } = require('express');
const Ingreso = require('../models/ingreso');
const Dingreso = require('../models/dingreso');
const Producto = require('../models/producto');

const getIngresos = async(req, res) => {

    const uid = req.uid;

    const ingresos = await Ingreso.find().sort({ createdAt: -1 }).populate('user');

    res.json({
        ok: true,
        ingresos,
        usuario: uid
    });
};

function initData(req, res) {
    Ingreso.find().sort({ createdAt: -1 }).populate('user').exec((err, data) => {
        if (data) {
            res.status(200).send({ data: data });
        }
    });
}

const getIngreso = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Ingreso.findById(id)
        .exec((err, ingreso) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar Ingreso',
                    errors: err
                });
            }
            if (!ingreso) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El Ingreso con el id ' + id + 'no existe',
                    errors: { message: 'No existe un Ingreso con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                ingreso: ingreso
            });
        });

};

const crearIngreso = async(req, res) => {

    const uid = req.uid;
    const ingreso = new Ingreso({
        usuario: uid,
        ...req.body
    });

    try {

        const ingresoDB = await ingreso.save();

        res.json({
            ok: true,
            ingreso: ingresoDB
        });

    } catch (error) {
        // console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }


};

const actualizarIngreso = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const ingreso = await Ingreso.findById(id);
        if (!ingreso) {
            return res.status(500).json({
                ok: false,
                msg: 'ingreso no encontrado por el id'
            });
        }

        const cambiosIngreso = {
            ...req.body,
            usuario: uid
        }

        const ingresoActualizado = await Ingreso.findByIdAndUpdate(id, cambiosIngreso, { new: true });

        res.json({
            ok: true,
            ingresoActualizado
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};

const borrarIngreso = async(req, res) => {

    const id = req.params.id;

    try {

        const ingreso = await Ingreso.findById(id);
        if (!ingreso) {
            return res.status(500).json({
                ok: false,
                msg: 'Ingreso no encontrado por el id'
            });
        }

        await Ingreso.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'Ingreso eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};

function detalle(req, res) {
    var id = req.params['id'];
    Ingreso.findById({ _id: id }).populate('user').exec((err, data_ingreso) => {
        Dingreso.find({ ingreso: id }).populate('producto').exec((err, data_detalle) => {
            res.status(200).send({
                ingreso: data_ingreso,
                detalle: data_detalle
            });
        });
    })
}



function listar(req, res) {
    var tipo = req.params['tipo'];
    var orden = req.params['orden'];
    var search = req.params['search'];
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


    if (tipo == 'null' && search == 'null') {
        if (orden == 'fecha+') {
            Ingreso.find().sort({ createdAt: -1 }).populate('user').exec((err, data) => {
                if (data) {
                    res.status(200).send({ data: data });
                }
            });
        } else if (orden == 'fecha-') {
            Ingreso.find().sort({ createdAt: 1 }).populate('user').exec((err, data) => {
                if (data) {
                    res.status(200).send({ data: data });
                }
            });
        } else if (orden == 'pagado+') {
            Ingreso.find().sort({ total_pagado: -1 }).populate('user').exec((err, data) => {
                if (data) {
                    res.status(200).send({ data: data });
                }
            });
        } else if (orden == 'pagado-') {
            Ingreso.find().sort({ total_pagado: 1 }).populate('user').exec((err, data) => {
                if (data) {
                    res.status(200).send({ data: data });
                }
            });
        } else if (orden == 'null') {
            Ingreso.find().sort({ createdAt: -1 }).populate('user').exec((err, data) => {
                if (data) {
                    res.status(200).send({ data: data });
                }
            });
        }
    } else {
        if (tipo == 'fecha') {
            if (orden == 'fecha+') {
                Ingreso.find({ year: data[0], day: new RegExp(dia, 'i'), month: new RegExp(mes, 'i') }).populate('user').sort({ createdAt: -1 }).exec((err, data) => {
                    if (data) {
                        res.status(200).send({ data: data });
                    }
                });
            } else if (orden == 'fecha-') {
                Ingreso.find({ year: data[0], day: new RegExp(dia, 'i'), month: new RegExp(mes, 'i') }).populate('user').sort({ createdAt: 1 }).exec((err, data) => {
                    if (data) {
                        res.status(200).send({ data: data });
                    }
                });
            }
            if (orden == 'pagado+') {
                Ingreso.find({ year: data[0], day: new RegExp(dia, 'i'), month: new RegExp(mes, 'i') }).populate('user').sort({ total_pagado: -1 }).exec((err, data) => {
                    if (data) {
                        res.status(200).send({ data: data });
                    }
                });
            }
            if (orden == 'pagado-') {
                Ingreso.find({ year: data[0], day: new RegExp(dia, 'i'), month: new RegExp(mes, 'i') }).populate('user').sort({ total_pagado: 1 }).exec((err, data) => {
                    if (data) {
                        res.status(200).send({ data: data });
                    }
                });
            }
        } else if (tipo == 'codigo') {

            Ingreso.find({ _id: search }).populate('user').exec((err, data) => {

                // console.log(data);
                res.status(200).send({ data: data });

            });
        }
    }


}

function get_img(req, res) {
    var img = req.params['img'];


    if (img != "null" || img != 'undefined') {
        fs.stat('./uploads/ingresos/factura/' + img, function(err) {
            if (!err) {
                let path_img = './uploads/ingresos/facturas/' + img;
                res.status(200).sendFile(path.resolve(path_img));
            } else if (err.code === 'ENOENT') {
                let path_img = './uploads/ingresos/no-image.jpg';
                res.status(200).sendFile(path.resolve(path_img));
            }
        });
    } else {
        let path_img = './uploads/ingresos/no-image.jpg';
        res.status(200).sendFile(path.resolve(path_img));
    }

}


module.exports = {
    getIngresos,
    crearIngreso,
    actualizarIngreso,
    borrarIngreso,
    getIngreso,
    initData,
    listar,
    detalle,
    get_img
};