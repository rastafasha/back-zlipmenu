const { response } = require('express');
const Cupon = require('../models/cupon');

const getCupons = async(req, res) => {

    Cupon.find().populate('categoria').exec((err, data_cupones) => {
        if (!err) {
            if (data_cupones) {
                res.status(200).send({ cupones: data_cupones });
            } else {
                res.status(500).send({ error: err });
            }
        } else {
            res.status(500).send({ error: err });
        }
    });
};

const getCuponbyId = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Cupon.findById(id)
        .exec((err, cupon) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar Cupon',
                    errors: err
                });
            }
            if (!cupon) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El Cupon con el id ' + id + 'no existe',
                    errors: { message: 'No existe un Cupon con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                cupon: cupon
            });
        });

};

const getCuponbyCode = async(req, res) => {

    const codigo = req.params.codigo;

    Cupon.find({ codigo: codigo}).exec((err, cupon_data) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (cupon_data) {
                res.status(200).send({ cupon: cupon_data });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });
};

const crearCupon = async(req, res) => {

    let data = req.body;

    var cupon = new Cupon;

    cupon.tipo = data.tipo;
    cupon.descuento = data.descuento;
    cupon.user = data.user;
    cupon.codigo = data.codigo;

    if (data.categoria) {
        cupon.categoria = data.categoria;
    } else {
        cupon.categoria = null;
    }
    if (data.subcategoria) {
        cupon.subcategoria = data.subcategoria;
    } else {
        cupon.subcategoria = '';
    }

    cupon.save((err, cupon_data) => {
        if (!err) {
            if (cupon_data) {
                res.status(200).send({ cupon: cupon_data });
            } else {
                res.status(500).send({ error: err });
                console.log(err);
            }
        } else {
            res.status(500).send({ error: err });
        }
    });


};

const actualizarCupon = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const cupon = await Cupon.findById(id);
        if (!cupon) {
            return res.status(500).json({
                ok: false,
                msg: 'contacto no encontrado por el id'
            });
        }

        const cambiosCupon = {
            ...req.body,
            usuario: uid
        }

        const cuponActualizado = await Cupon.findByIdAndUpdate(id, cambiosCupon, { new: true });

        res.json({
            ok: true,
            cuponActualizado
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};

const borrarCupon = async(req, res) => {

    const id = req.params.id;

    try {

        const cupon = await Cupon.findById(id);
        if (!cupon) {
            return res.status(500).json({
                ok: false,
                msg: 'cupon no encontrado por el id'
            });
        }

        await Cupon.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'cupon eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};





module.exports = {
    getCupons,
    crearCupon,
    actualizarCupon,
    borrarCupon,
    getCuponbyId,
    getCuponbyCode
};