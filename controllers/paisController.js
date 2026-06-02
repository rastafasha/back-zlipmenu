const { response } = require('express');
const Pais = require('../models/pais');

const getPaises = async (req, res) => {

    try {
        const paises = await Pais.find().sort({ pais: 1 });
        res.json({
            ok: true,
            paises
        });
    } catch (error) {
        // console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado'
        });
    }
};

const getPais = async (req, res) => {
    const id = req.params.id;
    try {
        const pais = await Pais.findById(id);
        if (!pais) {
            return res.status(404).json({
                ok: false,
                msg: 'País no encontrado'
            });
        }
        res.json({
            ok: true,
            pais
        });
    } catch (error) {
        // console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado'
        });
    }
};

const getPaisByCode = async (req, res) => {
    const code = req.params.code;
    try {
        const pais = await Pais.findOne({ code: code.toUpperCase() });
        if (!pais) {
            return res.status(404).json({
                ok: false,
                msg: 'País no encontrado'
            });
        }
        res.json({
            ok: true,
            pais
        });
    } catch (error) {
        // console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado'
        });
    }
};

const crearPais = async (req, res) => {
    const pais = new Pais(req.body);
    try {
        const paisDB = await pais.save();
        res.json({
            ok: true,
            pais: paisDB
        });
    } catch (error) {
        // console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al crear país'
        });
    }
};

const actualizarPais = async (req, res) => {
    const id = req.params.id;
    try {
        const pais = await Pais.findById(id);
        if (!pais) {
            return res.status(404).json({
                ok: false,
                msg: 'País no encontrado'
            });
        }

        const campos = req.body;
        const paisActualizado = await Pais.findByIdAndUpdate(id, campos, { new: true });

        res.json({
            ok: true,
            pais: paisActualizado
        });
    } catch (error) {
        // console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al actualizar país'
        });
    }
};

const borrarPais = async (req, res) => {
    const id = req.params.id;
    try {
        const pais = await Pais.findById(id);
        if (!pais) {
            return res.status(404).json({
                ok: false,
                msg: 'País no encontrado'
            });
        }

        await Pais.findByIdAndDelete(id);
        res.json({
            ok: true,
            msg: 'País eliminado'
        });
    } catch (error) {
        // console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al eliminar país'
        });
    }
};

module.exports = {
    getPaises,
    getPais,
    getPaisByCode,
    crearPais,
    actualizarPais,
    borrarPais
};

