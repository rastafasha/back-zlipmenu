const { response } = require('express');
const Promocion = require('../models/promocion');
const Usuario = require('../models/usuario');
const mongoose = require('mongoose');

const getPromocions = async(req, res) => {

    const promocions = await Promocion.find().populate('first_title img producto_title');

    res.json({
        ok: true,
        promocions
    });
};

const getPromocion = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Promocion.findById(id)
        .exec((err, promocion) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar Promocion',
                    errors: err
                });
            }
            if (!promocion) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El Promocion con el id ' + id + 'no existe',
                    errors: { message: 'No existe un Promocion con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                promocion: promocion
            });
        });

};

const crearPromocion = async (req, res) => {
    const uid = req.uid;
    const { local, ...restoDatos } = req.body;

    try {
        // Opcional: Verificar rol del usuario (ajusta 'ADMIN_ROLE' o 'SUPER_ROLE' según tu BD)
        const usuarioDB = await Usuario.findById(uid);
        if (!usuarioDB) {
            return res.status(404).json({
                ok: false,
                msg: 'Usuario no encontrado'
            });
        }

        const esSuperAdmin = usuarioDB.role === 'SUPERADMIN'; 

        // Seguridad: Si NO es superadmin y NO envía local, bloqueamos la creación
        if (!esSuperAdmin && !local) {
            return res.status(403).json({
                ok: false,
                msg: 'Debe especificar una tienda (local) para crear la promoción'
            });
        }

        // Construimos el objeto limpiando local si viene como string vacío ""
        const nuevaPromocionData = {
            ...restoDatos,
            usuario: uid,
            local: local ? local : null,
            esGlobal: !local && esSuperAdmin
        };

        const promocion = new Promocion(nuevaPromocionData);
        const promocionDB = await promocion.save();

        res.json({
            ok: true,
            promocion: promocionDB
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }
};

const actualizarPromocion = async (req, res) => {
    const id = req.params.id;
    const uid = req.uid;
    const { local, ...restoDatos } = req.body;

    try {
        const promocion = await Promocion.findById(id);
        if (!promocion) {
            return res.status(404).json({
                ok: false,
                msg: 'Promoción no encontrada por el id'
            });
        }

        const usuarioDB = await Usuario.findById(uid);
        if (!usuarioDB) {
            return res.status(404).json({
                ok: false,
                msg: 'Usuario no encontrado'
            });
        }

        const esSuperAdmin = usuarioDB.role === 'SUPERADMIN'; // Ajusta el nombre de tu rol

        // 1. Seguridad: Si la promoción actual es global (local === null), solo el SuperAdmin puede editarla
        if (!promocion.local && !esSuperAdmin) {
            return res.status(403).json({
                ok: false,
                msg: 'No tiene privilegios para editar una promoción global'
            });
        }

        // 2. Seguridad: Un usuario normal no puede quitar el local para volver global una promo
        if (!esSuperAdmin && local === '') {
            return res.status(403).json({
                ok: false,
                msg: 'Debe mantener una tienda (local) asignada a la promoción'
            });
        }

        // 3. Preparamos los cambios manteniendo el local actual si no viene en el body
        const localFinal = local !== undefined ? (local ? local : null) : promocion.local;

        const cambiosPromocion = {
            ...restoDatos,
            usuario: uid,
            local: localFinal,
            esGlobal: !localFinal && esSuperAdmin
        };

        const promocionActualizado = await Promocion.findByIdAndUpdate(
            id, 
            cambiosPromocion, 
            { new: true }
        );

        res.json({
            ok: true,
            promocionActualizado
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error, hable con el admin'
        });
    }
};

const borrarPromocion = async(req, res) => {

    const id = req.params.id;

    try {

        const promocion = await Promocion.findById(id);
        if (!promocion) {
            return res.status(500).json({
                ok: false,
                msg: 'promocion no encontrado por el id'
            });
        }

        await Promocion.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'promocion eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};



const listar_active = async(req, res) => {

    Promocion.find({  estado: [true] }).exec((err, promocion_data) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (promocion_data) {
                res.status(200).send({ promocion: promocion_data });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });

};

function desactivar(req, res) {
    var id = req.params['id'];

    Promocion.findByIdAndUpdate({ _id: id }, { estado: false }, (err, promocion_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (promocion_data) {
                res.status(200).send({ promocion: promocion_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el promocion, vuelva a intentar nuevamente.' });
            }
        }
    })
}

function activar(req, res) {
    var id = req.params['id'];
    // console.log(id);
    Promocion.findByIdAndUpdate({ _id: id }, { estado: true }, (err, promocion_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (promocion_data) {
                res.status(200).send({ promocion: promocion_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el promocion, vuelva a intentar nuevamente.' });
            }
        }
    })
}

const getPromocionesByLocal = async (req, res) => {
    const localId = req.params.localId;

    // 1. Validar que el ID recibido sea un ObjectId válido de MongoDB
    if (!mongoose.Types.ObjectId.isValid(localId)) {
        return res.status(400).json({
            ok: false,
            msg: 'El ID del local no es válido'
        });
    }

    try {
        // 2. Buscar promociones de ese local (y opcionalmente ordenar de más reciente a más antigua)
        const promociones = await Promocion.find({ localId })
            .sort({ _id: -1 });

        res.json({
            ok: true,
            promociones
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al obtener las promociones del local'
        });
    }
};

const listar_activeByLocal = async (req, res) => {
    try {
        const localId = req.params.localId;

        // Ambos criterios van dentro del mismo objeto de filtro
        const promocion_data = await Promocion.find({ 
            estado: true, 
            local: localId 
        });

        // Se verifica si el arreglo tiene elementos
        if (promocion_data.length > 0) {
            return res.status(200).send({ promociones: promocion_data });
        } else {
            return res.status(404).send({ message: 'No se encontró ningún dato en esta sección.' });
        }

    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
    }
};





module.exports = {
    getPromocions,
    crearPromocion,
    actualizarPromocion,
    borrarPromocion,
    getPromocion,
    listar_active,
    desactivar,
    activar,
    getPromocionesByLocal,
    listar_activeByLocal
};