const { response } = require('express');
const Shipping = require('../models/shipping');

const getShippings = async(req, res) => {

    const shippings = await Shipping.find();

    res.json({
        ok: true,
        shippings
    });
};

const getShipping = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Shipping.findById(id)
        .exec((err, shipping) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar Shipping',
                    errors: err
                });
            }
            if (!shipping) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El shipping con el id ' + id + 'no existe',
                    errors: { message: 'No existe un shipping con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                shipping: shipping
            });
        });


    // res.json({
    //     ok: true,
    //     categoria
    //     //uid: req.uid
    // });
};

const crearShipping = async(req, res) => {

    const uid = req.uid;
    const shipping = new Shipping({
        usuario: uid,
        ...req.body
    });

    try {

        const shippingDB = await shipping.save();

        res.json({
            ok: true,
            shipping: shippingDB
        });

    } catch (error) {
        // console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }


};

const actualizarShipping = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const shipping = await Shipping.findById(id);
        if (!shipping) {
            return res.status(500).json({
                ok: false,
                msg: 'shipping no encontrado por el id'
            });
        }

        const cambiosShipping = {
            ...req.body,
            usuario: uid
        }

        const shippingActualizado = await Shipping.findByIdAndUpdate(id, cambiosShipping, { new: true });

        res.json({
            ok: true,
            shippingActualizado
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};

const borrarShipping = async(req, res) => {

    const id = req.params.id;

    try {

        const shipping = await Shipping.findById(id);
        if (!shipping) {
            return res.status(500).json({
                ok: false,
                msg: 'shipping no encontrado por el id'
            });
        }

        await Shipping.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'shipping eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};



module.exports = {
    getShippings,
    crearShipping,
    actualizarShipping,
    borrarShipping,
    getShipping,
};