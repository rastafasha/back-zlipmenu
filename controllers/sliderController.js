const { response } = require('express');
const Slider = require('../models/slider');

const getSliders = async(req, res) => {

    const sliders = await Slider.find();

    res.json({
        ok: true,
        sliders
    });
};

const getSlider = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Slider.findById(id)
        .exec((err, slider) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar slider',
                    errors: err
                });
            }
            if (!slider) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El slider con el id ' + id + 'no existe',
                    errors: { message: 'No existe un slider con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                slider: slider
            });
        });

};

const crearSlider = async(req, res) => {

    const uid = req.uid;
    const slider = new Slider({
        usuario: uid,
        ...req.body
    });

    try {

        const sliderDB = await slider.save();

        res.json({
            ok: true,
            slider: sliderDB
        });

    } catch (error) {
        // console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }


};

const actualizarSlider = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const slider = await Slider.findById(id);
        if (!slider) {
            return res.status(500).json({
                ok: false,
                msg: 'slider no encontrado por el id'
            });
        }

        const cambiosSlider = {
            ...req.body,
            usuario: uid
        }

        const sliderActualizado = await Slider.findByIdAndUpdate(id, cambiosSlider, { new: true });

        res.json({
            ok: true,
            sliderActualizado
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};

const borrarSlider = async(req, res) => {

    const id = req.params.id;

    try {

        const slider = await Slider.findById(id);
        if (!slider) {
            return res.status(500).json({
                ok: false,
                msg: 'slider no encontrado por el id'
            });
        }

        await Slider.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'slider eliminado'
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

    Slider.findByIdAndUpdate({ _id: id }, { status: 'Desactivado' }, (err, slider_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (slider_data) {
                res.status(200).send({ slider: slider_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el slider, vuelva a intentar nuevamente.' });
            }
        }
    })
}

function activar(req, res) {
    var id = req.params['id'];
    // console.log(id);
    Slider.findByIdAndUpdate({ _id: id }, { status: 'Activo' }, (err, slider_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (slider_data) {
                res.status(200).send({ slider: slider_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el slider, vuelva a intentar nuevamente.' });
            }
        }
    })
}

const listar_active = async(req, res) => {

    Slider.find({  status: ['true'] }).exec((err, sliders_data) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (sliders_data) {
                res.status(200).send({ sliders: sliders_data });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });

};

module.exports = {
    getSliders,
    crearSlider,
    actualizarSlider,
    borrarSlider,
    getSlider,
    desactivar,
    activar,
    listar_active
};