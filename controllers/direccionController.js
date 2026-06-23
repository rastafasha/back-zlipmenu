const { response } = require('express');
const Direccion = require('../models/direccion');

const getDireccions = async(req, res) => {

    const direccions = await Direccion.find().sort({ createdAt: -1 });

    res.json({
        ok: true,
        direccions
    });
};

const getDireccion = (req, res) => {
    // 1. Obtenemos el ID de los parámetros de la ruta
    const id = req.params.id; 

    // 2. CORRECCIÓN: findById recibe el ID directo, NO un objeto con {_id: id}
    Direccion.findById(id, (err, data_direccion) => {
        
        // Si ocurre un error real de base de datos (ej. ID mal estructurado)
        if (err) {
            return res.status(500).send({ ok: false, error: 'Error en el servidor', detalle: err });
        }

        // Si la consulta fue exitosa pero el ID no existe en la BD
        if (!data_direccion) {
            return res.status(404).send({ ok: false, mensaje: 'La dirección no existe' });
        }

        // Si se encontró la dirección perfectamente
        return res.status(200).send({ ok: true, direccion: data_direccion });
    });
};

const crearDireccion = async(req, res) => {

    const uid = req.uid;
    const direccion = new Direccion({
        usuario: uid,
        ...req.body
    });

    try {

        const direccionDB = await direccion.save();

        res.json({
            ok: true,
            direccion: direccionDB
        });

    } catch (error) {
        // console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }


};

const actualizarDireccion = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const direccion = await Direccion.findById(id);
        if (!direccion) {
            return res.status(500).json({
                ok: false,
                msg: 'direccion no encontrado por el id'
            });
        }

        const cambiosDireccion = {
            ...req.body,
            usuario: uid
        }

        const direccionActualizado = await Direccion.findByIdAndUpdate(id, cambiosDireccion, { new: true });

        res.json({
            ok: true,
            direccionActualizado
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};

const borrarDireccion = async(req, res) => {

    const id = req.params.id;

    try {

        const direccion = await Direccion.findById(id);
        if (!direccion) {
            return res.status(500).json({
                ok: false,
                msg: 'direccion no encontrado por el id'
            });
        }

        await Direccion.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'Direccion eliminado'
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
    Direccion.find({ user: id }, (err, data_direccion) => {
        if (!err) {
            if (data_direccion) {
                res.status(200).send({ direcciones: data_direccion });
            } else {
                res.status(500).send({ error: err });
            }
        } else {
            res.status(500).send({ error: err });
        }
    }).sort({ createdAt: -1 });
}



module.exports = {
    getDireccions,
    crearDireccion,
    actualizarDireccion,
    borrarDireccion,
    getDireccion,
    listarPorUsuario
};