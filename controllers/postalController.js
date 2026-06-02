const { response } = require('express');
const Postal = require('../models/postal');

function getPostals(req, res) {
    Postal.find().exec((err, data_postales) => {
        if (!err) {
            if (data_postales) {
                res.status(200).send({ postales: data_postales });
            } else {
                res.status(500).send({ error: err });
            }
        } else {
            res.status(500).send({ error: err });
        }
    });
}

const getPostal = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Postal.findById(id)
        .exec((err, postal) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar Postal',
                    errors: err
                });
            }
            if (!postal) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El Postal con el id ' + id + 'no existe',
                    errors: { message: 'No existe un Postal con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                postal: postal
            });
        });


};

const crearPostal = async(req, res) => {

    const uid = req.uid;
    const postal = new Postal({
        usuario: uid,
        ...req.body
    });

    try {

        const postalDB = await postal.save();

        res.json({
            ok: true,
            postal: postalDB
        });

    } catch (error) {
        // console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }


};

const actualizarPostal = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const postal = await Postal.findById(id);
        if (!postal) {
            return res.status(500).json({
                ok: false,
                msg: 'Postal no encontrado por el id'
            });
        }

        const cambiosPostal = {
            ...req.body,
            usuario: uid
        }

        const postalActualizado = await Postal.findByIdAndUpdate(id, cambiosPostal, { new: true });

        res.json({
            ok: true,
            postalActualizado
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};

const borrarPostal = async(req, res) => {

    const id = req.params.id;

    try {

        const postal = await Postal.findById(id);
        if (!postal) {
            return res.status(500).json({
                ok: false,
                msg: 'Postal no encontrado por el id'
            });
        }

        await Postal.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'Postal eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};


module.exports = {
    getPostals,
    crearPostal,
    actualizarPostal,
    borrarPostal,
    getPostal,
};