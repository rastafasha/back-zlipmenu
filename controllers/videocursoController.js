const { response } = require('express');
const Videocurso = require('../models/videocurso');
const Categoria = require('../models/categoria');
const borrarImagen = require('../helpers/actualizar-imagen')
const fs = require('fs');



const getVideocursos = async(req, res) => {

    const videocursos = await Videocurso.find()
    .populate('curso');

    res.json({
        ok: true,
        videocursos
    });
};

const getVideocurso = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Videocurso.findById(id)
        .exec((err, videocurso) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar videocurso',
                    errors: err
                });
            }
            if (!videocurso) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El videocurso con el id ' + id + 'no existe',
                    errors: { message: 'No existe un videocurso con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                videocurso: videocurso
            });
        });

};

const crearVideocurso = async(req, res) => {

    const uid = req.uid;
    const videocurso = new Videocurso({
        usuario: uid,
        ...req.body
    });

    try {

        const videocursoDB = await videocurso.save();

        res.json({
            ok: true,
            videocurso: videocursoDB
        });

    } catch (error) {
        // console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }


};

const actualizarVideocurso = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const videocurso = await Videocurso.findById(id);
        if (!videocurso) {
            return res.status(500).json({
                ok: false,
                msg: 'videocurso no encontrado por el id'
            });
        }

        const cambiosVideocurso = {
            ...req.body,
            usuario: uid
        }

        const videocursoActualizado = await Videocurso.findByIdAndUpdate(id, cambiosVideocurso, { new: true });

        res.json({
            ok: true,
            videocursoActualizado
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};

const borrarVideocurso = async(req, res) => {

    const id = req.params.id;

    try {

        const videocurso = await Videocurso.findById(id);
        if (!videocurso) {
            return res.status(500).json({
                ok: false,
                msg: 'videocurso no encontrado por el id'
            });
        }

        await Videocurso.findByIdAndDelete(id);



        res.json({
            ok: true,
            msg: 'videocurso eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};

function desactivar(req, res) {
    var id = req.params['id'];

    Videocurso.findByIdAndUpdate({ _id: id }, { status: 'Desactivado' }, (err, videocurso_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (videocurso_data) {
                res.status(200).send({ videocurso: videocurso_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el videocurso, vuelva a intentar nuevamente.' });
            }
        }
    })
}

function activar(req, res) {
    var id = req.params['id'];
    // console.log(id);
    Videocurso.findByIdAndUpdate({ _id: id }, { status: 'Activo' }, (err, videocurso_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (videocurso_data) {
                res.status(200).send({ videocurso: videocurso_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el curso, vuelva a intentar nuevamente.' });
            }
        }
    })
}

function findByCurso(req, res) {
    var id = req.params['id'];

    console.log(id);
    if (id == 'null') {
        Videocurso.find().exec((err, videocurso_data) => {
            if (err) {
                res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
            } else {
                if (videocurso_data) {
                    res.status(200).send({ videocurso: videocurso_data });
                } else {
                    res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                }
            }
        });
    } else {
        Videocurso.find({ curso: id }).exec((err, videocurso_data) => {
            if (err) {
                res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
            } else {
                if (videocurso_data) {
                    res.status(200).send({ videocurso: videocurso_data });
                } else {
                    res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                }
            }
        });
    }

}




module.exports = {
    getVideocursos,
    getVideocurso,
    crearVideocurso,
    actualizarVideocurso,
    borrarVideocurso,
    desactivar,
    activar,
    findByCurso


};