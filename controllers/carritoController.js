const { response } = require('express');
const Carrito = require('../models/carrito');

const getCarritos = async(req, res) => {

    const carritos = await Carrito.find();

    res.json({
        ok: true,
        carritos
    });
};



const crearCarrito = async(req, res) => {

    const uid = req.uid;
    const carrito = new Carrito({
        usuario: uid,
        ...req.body
    });

    try {

        const carritoDB = await carrito.save();

        res.json({
            ok: true,
            carrito: carritoDB
        });

    } catch (error) {
        // console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }


};

const actualizarCarrito = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const carrito = await Carrito.findById(id);
        if (!carrito) {
            return res.status(500).json({
                ok: false,
                msg: 'carrito no encontrado por el id'
            });
        }

        const cambiosCarrito = {
            ...req.body,
            usuario: uid
        }

        const carritoActualizado = await Carrito.findByIdAndUpdate(id, cambiosCarrito, { new: true });

        res.json({
            ok: true,
            carritoActualizado
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
    Carrito.find({ user: id }, (err, carrito_data) => {
        if (!err) {
            if (carrito_data) {
                res.status(200).send({ carrito: carrito_data });
            } else {
                res.status(500).send({ error: err });
            }
        } else {
            res.status(500).send({ error: err });
        }
    });
}
const previewCarrito = (req, res) => {
    const id = req.params.id;

    Carrito.find({ user: id }).populate('producto').sort({ createdAt: -1 }).exec((err, carrito_data) => {
        if (!err) {
            if (carrito_data) {
                res.status(200).send({ carrito: carrito_data });
            } else {
                res.status(500).send({ error: err });
            }
        } else {
            res.status(500).send({ error: err });
        }
    });
}

const removeCarrito = (req, res) => {
    const id = req.params.id;
    Carrito.findByIdAndRemove({ _id: id }, (err, carrito_data) => {
        if (!err) {
            if (carrito_data) {
                res.status(200).send({ carrito: carrito_data });
            } else {
                res.status(500).send({ error: err });
            }
        } else {
            res.status(500).send({ error: err });
        }
    });
}



module.exports = {
    getCarritos,
    crearCarrito,
    actualizarCarrito,
    previewCarrito,
    removeCarrito,
    listarPorUsuario
};