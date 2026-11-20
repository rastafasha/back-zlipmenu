const { response } = require('express');
const Favorito = require('../models/favorites');

const crearFavorito = async (req, res) => {
    const uid = req.uid;
    const { producto, local } = req.body;

    if (!local) {
        return res.status(400).json({
            ok: false,
            msg: 'El ID del local es obligatorio'
        });
    }

    try {
        // Evita duplicados del mismo producto en el mismo local para ese usuario
        const existeFavorito = await Favorito.findOne({ usuario: uid, producto, local });
        if (existeFavorito) {
            return res.status(200).json({
                ok: true,
                favorito: existeFavorito,
                msg: 'El producto ya estaba en favoritos'
            });
        }

        const favorito = new Favorito({
            usuario: uid,
            ...req.body
        });

        const favoritoDB = await favorito.save();

        res.json({
            ok: true,
            favorito: favoritoDB
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }
};



const getFavoritos = async(req, res) => {

    const favoritos = await Favorito.find()
        .populate('blog')
        .populate('usuario')

    res.json({
        ok: true,
        favoritos
    });
};



const getFavorito = async(req, res) => {

    const id = req.params.id;

    Favorito.findById(id)
        .populate('usuario')
        .exec((err, favorito) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar favorito',
                    errors: err
                });
            }
            if (!favorito) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El favorito con el id ' + id + 'no existe',
                    errors: { message: 'No existe un favorito con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                favorito: favorito
            });
        });

};

const borrarFavorito = async (req, res) => {
    const id = req.query.id; // <-- Cambio de params a query

    try {
        const favorito = await Favorito.findByIdAndDelete(id); // Busca y elimina en un solo paso
        
        if (!favorito) {
            return res.status(404).json({
                ok: false,
                msg: 'Favorito no encontrado por el id'
            });
        }

        res.json({
            ok: true,
            msg: 'Favorito eliminado'
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error, hable con el admin'
        });
    }
};



const listarFavoritoPorUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { local } = req.body; // Extraemos 'local' desde el body

        const filtro = { usuario: id };
        if (local) {
            filtro.local = local;
        }

        const data_favorito = await Favorito.find(filtro)
            .populate('producto')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).send({ favoritos: data_favorito });
    } catch (err) {
        console.log(err);
        res.status(500).send({ error: err });
    }
};



module.exports = {
    crearFavorito,
    getFavoritos,
    getFavorito,
    borrarFavorito,
    listarFavoritoPorUsuario

};