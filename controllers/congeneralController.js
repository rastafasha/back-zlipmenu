const { response } = require('express');
const Congeneral = require('../models/congeneral');

const getCongenerals = async(req, res) => {

    const congenerals = await Congeneral.find().populate('titulo img');

    res.json({
        ok: true,
        congenerals
    });
};

const getCongeneral = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Congeneral.findById(id)
        .exec((err, congeneral) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar Congeneral',
                    errors: err
                });
            }
            if (!congeneral) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El Congeneral con el id ' + id + 'no existe',
                    errors: { message: 'No existe un Congeneral con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                congeneral: congeneral
            });
        });


    // res.json({
    //     ok: true,
    //     categoria
    //     //uid: req.uid
    // });
};

const crearCongeneral = async(req, res) => {

    const uid = req.uid;
    const congeneral = new Congeneral({
        usuario: uid,
        ...req.body
    });

    try {

        const congeneralDB = await congeneral.save();

        res.json({
            ok: true,
            congeneral: congeneralDB
        });

    } catch (error) {
        // console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }


};

const actualizarCongeneral = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const congeneral = await Congeneral.findById(id);
        if (!congeneral) {
            return res.status(500).json({
                ok: false,
                msg: 'Congeneral no encontrado por el id'
            });
        }

        const cambiosCongeneral = {
            ...req.body,
            usuario: uid
        }

        const congeneralActualizado = await Congeneral.findByIdAndUpdate(id, cambiosCongeneral, { new: true });

        res.json({
            ok: true,
            congeneralActualizado
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};

const borrarCongeneral = async(req, res) => {

    const id = req.params.id;

    try {

        const congeneral = await Congeneral.findById(id);
        if (!congeneral) {
            return res.status(500).json({
                ok: false,
                msg: 'congeneral no encontrado por el id'
            });
        }

        await Congeneral.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'Congeneral eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};





module.exports = {
    getCongenerals,
    crearCongeneral,
    actualizarCongeneral,
    borrarCongeneral,
    getCongeneral,
};