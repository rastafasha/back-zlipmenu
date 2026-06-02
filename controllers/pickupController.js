const { response } = require('express');
const Pickup = require('../models/pickup');

const getPickups = async(req, res) => {

    const pickups = await Pickup.find();

    res.json({
        ok: true,
        pickups
    });
};

const getPickup = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Pickup.findById(id)
        .exec((err, pickup) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar pickup',
                    errors: err
                });
            }
            if (!pickup) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El pickup con el id ' + id + 'no existe',
                    errors: { message: 'No existe un pickup con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                pickup: pickup
            });
        });


};

const crearPickup = async(req, res) => {

    const uid = req.uid;
    const pickup = new Pickup({
        usuario: uid,
        ...req.body
    });

    try {

        const pickupDB = await pickup.save();

        res.json({
            ok: true,
            pickup: pickupDB
        });

    } catch (error) {
        // console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }


};

const actualizarPickup = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const pickup = await Pickup.findById(id);
        if (!pickup) {
            return res.status(500).json({
                ok: false,
                msg: 'pickup no encontrado por el id'
            });
        }

        const cambiosPickup = {
            ...req.body,
            usuario: uid
        }

        const pickupActualizado = await Pickup.findByIdAndUpdate(id, cambiosPickup, { new: true });

        res.json({
            ok: true,
            pickupActualizado
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};

const borrarPickup = async(req, res) => {

    const id = req.params.id;

    try {

        const pickup = await Pickup.findById(id);
        if (!pickup) {
            return res.status(500).json({
                ok: false,
                msg: 'pickup no encontrado por el id'
            });
        }

        await Pickup.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'pickup eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};



module.exports = {
    getPickups,
    crearPickup,
    actualizarPickup,
    borrarPickup,
    getPickup,
};