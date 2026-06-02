const { response } = require('express');
const Driver = require('../models/driver');
const Usuario = require('../models/usuario');
const Tienda = require('../models/tienda');

const crearDriver = async(req, res) => {

    const uid = req.uid;
    const driver = new Driver({
        user: uid,
        ...req.body
    });

    try {
        const driverDB = await driver.save();

        res.json({
            ok: true,
            driver: driverDB
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }


};

const actualizarDriver = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const driver = await Driver.findById(id);
        if (!driver) {
            return res.status(500).json({
                ok: false,
                msg: 'driver no encontrado por el id'
            });
        }

        const cambiosDriver = {
            ...req.body,
            user: uid
        }

        const driverActualizado = await Driver.findByIdAndUpdate(id, cambiosDriver, { new: true });

        res.json({
            ok: true,
            driverActualizado
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};

const getDrivers = async(req, res) => {

    const drivers = await Driver.find()
        .populate('user')

    res.json({
        ok: true,
        drivers
    });
};

const getDriver = async(req, res) => {

    const id = req.params.id;

    Driver.findById(id)
        .populate('user')
        .populate('asignaciones')
        .exec((err, driver) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar driver',
                    errors: err
                });
            }
            if (!driver) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El driver con el id ' + id + 'no existe',
                    errors: { message: 'No existe un driver con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                driver: driver
            });
        });

};


const borrarDriver = async(req, res) => {

    const id = req.params.id;

    try {

        const driver = await Driver.findById(id);
        if (!driver) {
            return res.status(500).json({
                ok: false,
                msg: 'driver no encontrado por el id'
            });
        }

        await driver.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'asignacion eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};

const listarDriverPorUsuario = async (req, res) => {
    const userId = req.params['userId'];

    try {
        //traemos el id del usuario
        const usuario = await Usuario.findById(userId);
        // console.log(userId);
        //filtramos el id y lo comparamos con el user dentro de driver.user
        const driver = await Driver.findOne({user: userId});
        // console.log(driver);
        if (!usuario) {
            return res.status(400).json({
                ok: false,
                mensaje: `El usuario con el id ${userId} no existe`,
                errors: { message: 'No existe un usuario con ese ID' }
            });
        }

        if (driver && driver.user && driver.user.toString() !== userId) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El driver no pertenece al usuario especificado',
                errors: { message: 'Driver does not belong to the user' }
            });
        }

        res.status(200).json({
            ok: true,
            usuario: usuario,
            driver: driver || null
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar usuario y driver',
            errors: error
        });
    }
};


const listarDriverPorLocal = async (req, res) => {
    const local = req.params['local'];

    try {
        //traemos el id dela tienda
        const tienda = await Tienda.findById(local);
        // console.log(local);
        //filtramos el id y lo comparamos con el user dentro de driver.user
        const drivers = await Driver.find()
        .populate('user')
        // console.log(drivers);
        
        if (!tienda) {
            return res.status(400).json({
                ok: false,
                mensaje: `El tienda con el id ${local} no existe`,
                errors: { message: 'No existe un tienda con ese ID' }
            });
        }

       

        res.status(200).json({
            ok: true,
            tienda: tienda.nombre,
            drivers: drivers || null
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar usuario y driver',
            errors: error
        });
    }
};


module.exports = {
    crearDriver,
    actualizarDriver,
    getDrivers,
    getDriver,
    borrarDriver,
    listarDriverPorUsuario,
    listarDriverPorLocal

};