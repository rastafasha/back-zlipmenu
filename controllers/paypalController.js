const { response } = require('express');
const Tienda = require('../models/tienda');
const Paypal = require('../models/paypal');
const bcrypt = require('bcryptjs'); 



const crearPaypal = async(req, res) => {
    const body = req.body;

    try {
        const existeTienda = await Tienda.findById(body.local);

        if (!existeTienda) {
            return res.status(400).json({
                ok: false,
                msg: 'La tienda no existe'
            });
        }

        const paypal = new Paypal({
            user: body.user,
            clientIdPaypal: body.clientIdPaypal,
            clientSecret: body.clientSecret, // Se encriptará abajo
            mode: body.mode,
            email: body.email,
            local: body.local,
        });

        // --- ENCRIPTACIÓN ---
        // Generar sal (salt) y encriptar la llave secreta
        const salt = bcrypt.genSaltSync(10);
        paypal.clientSecret = bcrypt.hashSync(body.clientSecret, salt);

        // Guardar en BD con la llave ya encriptada
        await paypal.save();

        res.json({
            ok: true,
            paypal
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado... revisar logs'
        });
    }
};

const actualizarPaypal = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {
        const paypalDB = await Paypal.findById(id);
        
        if (!paypalDB) {
            return res.status(404).json({
                ok: false,
                msg: 'Paypal no encontrado por el ID'
            });
        }

        // 1. Extraemos los datos del body
        const { clientSecret, ...campos } = req.body;

        // 2. Si el usuario envió una llave secreta nueva, la encriptamos
        if (clientSecret) {
            const salt = bcrypt.genSaltSync(10);
            campos.clientSecret = bcrypt.hashSync(clientSecret, salt);
        }

        // 3. Agregamos el usuario que actualiza
        campos.usuario = uid;

        // 4. Actualizamos solo con los campos procesados
        const paypalActualizado = await Paypal.findByIdAndUpdate(id, campos, { new: true });

        res.json({
            ok: true,
            paypal: paypalActualizado
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error, hable con el administrador'
        });
    }
};

const getPaypals = async(req, res) => {

    const paypals = await Paypal.find()
        .populate('local', 'nombre');
    res.json({
        ok: true,
        paypals
    });
};


const getPaypal = async(req, res) => {

    const id = req.params.id;

    Paypal.findById(id)
        .populate('local', 'nombre')
        .exec((err, paypal) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar paypal',
                    errors: err
                });
            }
            if (!paypal) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El paypal con el id ' + id + 'no existe',
                    errors: { message: 'No existe un paypal con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                paypal: paypal
            });
        });

};

const borrarPaypal = async(req, res) => {

    const id = req.params.id;

    try {

        const paypal = await Paypal.findById(id);
        if (!paypal) {
            return res.status(500).json({
                ok: false,
                msg: 'paypal no encontrado por el id'
            });
        }

        await Paypal.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'paypal eliminado'
        });

    } catch (error) {
        // console.log(error)
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};


const getPaypalTienda = async(req, res) => {

    var tiendaid = req.params['tiendaid'];
    try {
        const data_paypal = await Paypal.find({ local: tiendaid })
            .sort({ createdAt: -1 });

        res.status(200).send({ paypals: data_paypal });
    } catch (err) {
        res.status(500).send({ error: err });
    }

};


module.exports = {
    crearPaypal,
    actualizarPaypal,
    getPaypals,
    getPaypalTienda,
    getPaypal,
    borrarPaypal,

};