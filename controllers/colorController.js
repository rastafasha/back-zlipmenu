const { response } = require('express');
const Color = require('../models/color');

const getColors = async(req, res) => {

    const colors = await Color.find().populate('titulo producto');

    res.json({
        ok: true,
        colors
    });
};

const getColor = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Color.findById(id)
        .exec((err, color) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar color',
                    errors: err
                });
            }
            if (!color) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El color con el id ' + id + ' no existe',
                    errors: { message: 'No existe un color con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                color: color
            });
        });

};


const crearColor = (req, res) => {

    let data = req.body;

    var color = new Color;
    color.titulo = data.titulo;
    color.producto = data.producto;
    color.color = data.color;
    color.save((err, color_data) => {
        if (!err) {
            if (color_data) {
                res.status(200).send({ color: color_data });
            } else {
                res.status(500).send({ error: err });
            }
        } else {
            res.status(500).send({ error: err });
        }
    });


};

const actualizarColor = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const color = await Color.findById(id);
        if (!color) {
            return res.status(500).json({
                ok: false,
                msg: 'color no encontrado por el id'
            });
        }

        const cambiosColor = {
            ...req.body,
            usuario: uid
        }

        const colorActualizado = await Color.findByIdAndUpdate(id, cambiosColor, { new: true });

        res.json({
            ok: true,
            colorActualizado
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};

const borrarColor = async(req, res) => {

    const id = req.params.id;

    try {

        const color = await Color.findById(id);
        if (!color) {
            return res.status(500).json({
                ok: false,
                msg: 'Color no encontrado por el id'
            });
        }

        await Color.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'Color eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};

const findByProduct = (req, res) => {
    var id = req.params['id'];

    // console.log(id);
    if (id == 'null') {
        Color.find().exec((err, color_data) => {
            if (err) {
                res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
            } else {
                if (color_data) {
                    res.status(200).send({ color: color_data });
                } else {
                    res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                }
            }
        });
    } else {
        Color.find({ producto: id }).exec((err, color_data) => {
            if (err) {
                res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
            } else {
                if (color_data) {
                    res.status(200).send({ color: color_data });
                } else {
                    res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                }
            }
        });
    }

};



module.exports = {
    getColors,
    crearColor,
    actualizarColor,
    borrarColor,
    getColor,
    findByProduct
};