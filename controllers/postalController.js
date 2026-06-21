const { response } = require('express');
const Postal = require('../models/postal');
const Tienda = require('../models/tienda');

function getPostals(req, res) {
    Postal.find().exec((err, data_postales) => {
        if (!err) {
            if (data_postales) {
                res.status(200).send({ postales: data_postales });
            } else {
                res.status(500).send({ error: err });
            }
        } else {
            res.status(500).send({ error: err });
        }
    });
}

const getPostal = async (req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Postal.findById(id)
        .exec((err, postal) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar Postal',
                    errors: err
                });
            }
            if (!postal) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El Postal con el id ' + id + 'no existe',
                    errors: { message: 'No existe un Postal con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                postal: postal
            });
        });


};

const crearPostal = async (req, res) => {

    const uid = req.uid;
    const localId = req.body.local;

    // 1. Validación estricta del local con el mensaje correcto
    if (!localId) {
        return res.status(400).json({
            ok: false,
            msg: 'El ID del local es obligatorio para registrar el delivery.'
        });
    }

    // 2. Creamos la instancia limpiamente
    const postal = new Postal({
        usuario: uid,
        ...req.body
    });

    try {
        // 3. Guardamos en la base de datos
        const postalDB = await postal.save();

        res.json({
            ok: true,
            postal: postalDB
        });

    } catch (error) {
        console.error('Error al crear postal:', error); // Mejor un console.error en desarrollo
        res.status(500).json({
            ok: false,
            msg: 'Error interno en el servidor, hable con el administrador.'
        });
    }
};

// Tu controlador de Node.js recibe 'datosAsignacion' en el req.body
const actualizarPostal = async (req, res) => {
    const id = req.params.id; // El ID del pedido que enviamos en Angular

    try {
        const cambiosPostal = {
            ...req.body, // Aquí entran las coordenadas de entrega y el nuevo status 'INPROCESS'
            usuario: req.uid // ID del administrador/restaurante que asignó
        };

        const postalDB = await Postal.findByIdAndUpdate(id, cambiosPostal, { new: true });

        if (!postalDB) {
            return res.status(404).json({ ok: false, msg: 'Envío no encontrado' });
        }

        res.json({
            ok: true,
            postal: postalDB // La app del conductor estará escuchando este cambio para pintar su mapa
        });

    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al asignar envío' });
    }
};



const borrarPostal = async (req, res) => {

    const id = req.params.id;

    try {

        const postal = await Postal.findById(id);
        if (!postal) {
            return res.status(500).json({
                ok: false,
                msg: 'Postal no encontrado por el id'
            });
        }

        await Postal.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'Postal eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};

const obtenerPostalesPorLocal = async (req, res) => {
    
    // 1. Capturamos el ID del local desde los parámetros de la ruta
    const localId = req.params.localId;

    try {
        // 2. Buscamos las tarifas en la base de datos aplicando un ordenamiento automático
        // 🚀 EL TRUCO DE ORDENAMIENTO: .sort({ distancia: 1 }) o .sort({ kms: 1 })
        // Ordena las tarifas de menor a mayor distancia (ej: de 0km a 10km) para que el .find() de Angular funcione perfecto.
        const postalesDB = await Postal.find({ local: localId }).sort({ distancia: 1, kms: 1 });

        // 3. 🚨 CONTROL DE MEMORIA RENDER: Añadimos 'return' explícito para cerrar la conexión de red de inmediato
        return res.json({
            ok: true,
            postales: postalesDB
        });

    } catch (error) {
        console.error('Error al obtener postales por local:', error);
        
        // 🚨 CONTROL DE MEMORIA EN ERRORES: 'return' para liberar la RAM si el servidor crashea
        return res.status(500).json({
            ok: false,
            msg: 'Error interno en el servidor, hable con el administrador.'
        });
    }
};



module.exports = {
    getPostals,
    crearPostal,
    actualizarPostal,
    borrarPostal,
    getPostal,
    obtenerPostalesPorLocal
};