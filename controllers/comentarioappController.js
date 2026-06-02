const { response } = require('express');
const Comentario = require('../models/comentarioapp');
const Likescoment = require('../models/likescoment');
const Dislikescoment = require('../models/dislikescoment');

const getComentarios = async(req, res) => {

    const comentarios = await Comentario.find().sort({ createdAt: -1 });

    res.json({
        ok: true,
        comentarios
    });
};

const getComentario = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Comentario.findById(id)
        .exec((err, comentario) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar Comentario',
                    errors: err
                });
            }
            if (!comentario) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El Comentario con el id ' + id + 'no existe',
                    errors: { message: 'No existe un Comentario con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                comentario: comentario
            });
        });

};

const crearComentario = (req, res) => {

    let data = req.body;
    console.log(data);

    Comentario.find({ user: data.user}, (err, comentario_data) => {
        if (err) {
            console.log(err);
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (comentario_data.length != 0) {
                // console.log('si');
                // console.log(comentario_data);
                res.status(500).send({ message: 'Ya emitió un comentario en esta compra.' });
            } else {
                // console.log('no');
                // console.log(comentario);
                var comentario = new Comentario;
                comentario.comentario = data.comentario;
                comentario.pros = data.pros;
                comentario.cons = data.cons;
                comentario.estrellas = data.estrellas;
                comentario.tienda = data.tienda;
                comentario.user = data.user;
                comentario.save((err, comentario_save) => {
                    if (!err) {
                        if (comentario_save) {
                            res.status(200).send({ comentario: comentario_save });
                        } else {
                            c
                            res.status(500).send({ error: err });
                        }
                    } else {
                        res.status(500).send({ error: err });
                    }
                });
            }
        }
    });

};

const actualizarComentario = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const comentario = await Comentario.findById(id);
        if (!comentario) {
            return res.status(500).json({
                ok: false,
                msg: 'comentario no encontrado por el id'
            });
        }

        const cambiosComentario = {
            ...req.body,
            usuario: uid
        }

        const comentarioActualizado = await Comentario.findByIdAndUpdate(id, cambiosComentario, { new: true });

        res.json({
            ok: true,
            comentarioActualizado
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};

const borrarComentario = async(req, res) => {

    const id = req.params.id;

    try {

        const comentario = await Comentario.findById(id);
        if (!comentario) {
            return res.status(500).json({
                ok: false,
                msg: 'Comentario no encontrado por el id'
            });
        }

        await Comentario.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'Comentario eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};

function listarLast(req, res) {
    Comentario.find().populate('user').sort({ createdAt: -1 }).limit(3).exec((err, data_review) => {
        if (!err) {
            if (data_review) {
                res.status(200).send({ data: data_review });
            } else {
                res.status(500).send({ error: err });
            }
        } else {
            res.status(500).send({ error: err });
        }
    });
}

const getComentarioTienda = async(req, res) => {

    var tiendaid = req.params['tiendaid'];

    var tiendaid = req.params['tiendaid'];
        Comentario.find({tienda:tiendaid}).sort({ createdAt: -1 })
        .populate('user')
        .exec((err, data) => {
            if (data) {
                res.status(200).send({ comentarios: data });
            }
        }); 
};


module.exports = {
    getComentarios,
    crearComentario,
    actualizarComentario,
    borrarComentario,
    getComentario,
    listarLast,
    getComentarioTienda
};