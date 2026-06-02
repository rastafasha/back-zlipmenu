const { response } = require('express');
const Curso = require('../models/curso');
const Categoria = require('../models/categoria');
const borrarImagen = require('../helpers/actualizar-imagen')
const fs = require('fs');



const getCursos = async(req, res) => {

    const cursos = await Curso.find()
    
    .populate('titulo img categoria');

    res.json({
        ok: true,
        cursos
    });
};

const getCurso = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Curso.findById(id, {})
    // .populate('videocursos')
        .exec((err, curso) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar curso',
                    errors: err
                });
            }
            if (!curso) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El curso con el id ' + id + 'no existe',
                    errors: { message: 'No existe un curso con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                curso: curso
            });
        });

};

const crearCurso = async(req, res) => {

    const uid = req.uid;
    const curso = new Curso({
        usuario: uid,
        ...req.body
    });

    try {

        const cursoDB = await curso.save();

        res.json({
            ok: true,
            curso: cursoDB
        });

    } catch (error) {
        // console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }


};

const actualizarCurso = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const curso = await Curso.findById(id);
        if (!curso) {
            return res.status(500).json({
                ok: false,
                msg: 'curso no encontrado por el id'
            });
        }

        const cambiosCurso = {
            ...req.body,
            usuario: uid
        }

        const cursoActualizado = await Curso.findByIdAndUpdate(id, cambiosCurso, { new: true });

        res.json({
            ok: true,
            cursoActualizado
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};

const borrarCurso = async(req, res) => {

    const id = req.params.id;

    try {

        const curso = await Curso.findById(id);
        if (!curso) {
            return res.status(500).json({
                ok: false,
                msg: 'curso no encontrado por el id'
            });
        }

        await Curso.findByIdAndDelete(id);



        res.json({
            ok: true,
            msg: 'curso eliminado'
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

    Curso.findByIdAndUpdate({ _id: id }, { status: 'Desactivado' }, (err, curso_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (curso_data) {
                res.status(200).send({ curso: curso_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el curso, vuelva a intentar nuevamente.' });
            }
        }
    })
}

function activar(req, res) {
    var id = req.params['id'];
    // console.log(id);
    Curso.findByIdAndUpdate({ _id: id }, { status: 'Activo' }, (err, curso_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (curso_data) {
                res.status(200).send({ curso: curso_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el curso, vuelva a intentar nuevamente.' });
            }
        }
    })
}







module.exports = {
    getCursos,
    crearCurso,
    getCurso,
    actualizarCurso,
    borrarCurso,
    desactivar,
    activar,


};