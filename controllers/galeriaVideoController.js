const { response } = require('express');
const GaleriaVideo = require('../models/galeriavideos');

const getGalerias = async(req, res) => {

    const galeriavideos = await GaleriaVideo.find().populate('video curso');

    res.json({
        ok: true,
        galeriavideos
    });
};

const getGaleria = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    GaleriaVideo.findById(id)
        .exec((err, galeriavideo) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar Galeria',
                    errors: err
                });
            }
            if (!galeriavideo) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El Galeria con el id ' + id + 'no existe',
                    errors: { message: 'No existe un Galeria con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                galeriavideo: galeriavideo
            });
        });

};


const actualizarGaleria = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const galeriavideo = await GaleriaVideo.findById(id);
        if (!galeriavideo) {
            return res.status(500).json({
                ok: false,
                msg: 'video no encontrado por el id'
            });
        }

        const cambiosVideo = {
            ...req.body,
            usuario: uid
        }

        const videoActualizado = await GaleriaVideo.findByIdAndUpdate(id, cambiosVideo, { new: true });

        res.json({
            ok: true,
            videoActualizado
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};

const borrarGaleria = async(req, res) => {

    const id = req.params.id;

    try {

        const galeriavideo = await GaleriaVideo.findById(id);
        if (!galeriavideo) {
            return res.status(500).json({
                ok: false,
                msg: 'Galeria no encontrado por el id'
            });
        }

        await GaleriaVideo.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'Galeria eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};



function findByCurso(req, res) {
    var id = req.params['id'];

    // console.log(id);
    if (id == 'null') {
        GaleriaVideo.find().exec((err, galeria_data) => {
            if (err) {
                res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
            } else {
                if (galeria_data) {
                    res.status(200).send({ galeriavideo: galeria_data });
                } else {
                    res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                }
            }
        });
    } else {
        GaleriaVideo.find({ curso: id }).exec((err, galeria_data) => {
            if (err) {
                res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
            } else {
                if (galeria_data) {
                    res.status(200).send({ galeriavideo: galeria_data });
                } else {
                    res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                }
            }
        });
    }

}

const crearVideo = async(req, res) => {

    let data = req.body;

    var galeriavideo = new GaleriaVideo;
    galeriavideo.titulo = data.titulo;
    galeriavideo.curso = data.curso;
    galeriavideo.video = data.video;
    galeriavideo.save((err, galeria_data) => {
        if (!err) {
            if (galeria_data) {
                res.status(200).send({ galeriavideo: galeria_data });
            } else {
                res.status(500).send({ error: err });
            }
        } else {
            res.status(500).send({ error: err });
        }
    });


};

function desactivar(req, res) {
    var id = req.params['id'];

    GaleriaVideo.findByIdAndUpdate({ _id: id }, { status: 'Desactivado' }, (err, galeria_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (galeria_data) {
                res.status(200).send({ galeriavideo: galeria_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el video, vuelva a intentar nuevamente.' });
            }
        }
    })
}

function activar(req, res) {
    var id = req.params['id'];
    // console.log(id);
    GaleriaVideo.findByIdAndUpdate({ _id: id }, { status: 'Activo' }, (err, galeria_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (galeria_data) {
                res.status(200).send({ galeriavideo: galeria_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el video, vuelva a intentar nuevamente.' });
            }
        }
    })
}



module.exports = {
    getGalerias,
    actualizarGaleria,
    borrarGaleria,
    getGaleria,
    findByCurso,
    crearVideo,
    desactivar,
    activar
};