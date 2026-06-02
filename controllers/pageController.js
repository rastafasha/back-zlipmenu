const { response } = require('express');
const Page = require('../models/page');
const Categoria = require('../models/categoria');
const fs = require('fs');





const getPages = async(req, res) => {

    const pages = await Page.find().populate('titulo img categoria');

    res.json({
        ok: true,
        pages
    });
};

const getPage = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Page.findById(id)
        .exec((err, page) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar page',
                    errors: err
                });
            }
            if (!page) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El page con el id ' + id + 'no existe',
                    errors: { message: 'No existe un page con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                page: page
            });
        });

};

const crearPage = async(req, res) => {

    const uid = req.uid;
    

     // Convertir el título en slug
    const titulo = req.body.titulo || '';
    const slug = titulo.toLowerCase()
        .trim()
        .replace(/[\s]+/g, '-') // reemplaza espacios por guiones
        .replace(/[^\w\-]+/g, '') // elimina caracteres no alfanuméricos excepto guiones
        .replace(/\-\-+/g, '-') // reemplaza guiones múltiples por uno solo
        // reemplaza acentos y caracteres especiales
                .replace(/á/g, 'a')
                .replace(/é/g, 'e')
                .replace(/í/g, 'i')
                .replace(/ó/g, 'o')
                .replace(/ú/g, 'u')
                .replace(/ñ/g, 'n')
                .replace(/ü/g, 'u');

    const page = new Page({
        usuario: uid,
        ...req.body,
        slug: slug
    });

    try {

        const pageDB = await page.save();

        res.json({
            ok: true,
            page: pageDB
        });

    } catch (error) {
        // console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }


};

const actualizarPage = async(req, res) => {

      const id = req.params.id;
        const uid = req.uid;
    
        try {
    
            const page = await Page.findById(id);
            if (!page) {
                return res.status(500).json({
                    ok: false,
                    msg: 'page no encontrado por el id'
                });
            }
    
            const cambiosPage = {
                ...req.body,
                usuario: uid
            }
    
            // Si viene el título actualizado, actualizar el slug
            if (req.body.titulo) {
                const titulo = req.body.titulo;
                const slug = titulo.toLowerCase()
                    .trim()
                    .replace(/[\s]+/g, '-') // reemplaza espacios por guiones
                    .replace(/[^\w\-]+/g, '') // elimina caracteres no alfanuméricos excepto guiones
                    .replace(/\-\-+/g, '-') // reemplaza guiones múltiples por uno solo
                    // reemplaza acentos y caracteres especiales
                    .replace(/á/g, 'a')
                    .replace(/é/g, 'e')
                    .replace(/í/g, 'i')
                    .replace(/ó/g, 'o')
                    .replace(/ú/g, 'u')
                    .replace(/ñ/g, 'n')
                    .replace(/ü/g, 'u');
                cambiosPage.slug = slug;
            }
    
            const pageActualizado = await Page.findByIdAndUpdate(id, cambiosPage, { new: true });
    
            res.json({
                ok: true,
                pageActualizado
            });
    
        } catch (error) {
    
            res.status(500).json({
                ok: false,
                msg: 'Error hable con el admin'
            });
        }


};

const borrarPage = async(req, res) => {

    const id = req.params.id;

    try {

        const page = await Page.findById(id);
        if (!page) {
            return res.status(500).json({
                ok: false,
                msg: 'page no encontrado por el id'
            });
        }

        await Page.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'page eliminado'
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

    Page.findByIdAndUpdate({ _id: id }, { status: 'Desactivado' }, (err, page_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (page_data) {
                res.status(200).send({ page: page_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el page, vuelva a intentar nuevamente.' });
            }
        }
    })
}

function activar(req, res) {
    var id = req.params['id'];
    // console.log(id);
    Page.findByIdAndUpdate({ _id: id }, { status: 'Activo' }, (err, page_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (page_data) {
                res.status(200).send({ page: page_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el page, vuelva a intentar nuevamente.' });
            }
        }
    })
}


function find_by_slug(req, res) {
    var slug = req.params['slug'];

    Page.findOne({ slug: slug }).exec((err, page_data) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (page_data) {
                res.status(200).send({ page: page_data });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });
}



module.exports = {
    getPages,
    crearPage,
    getPage,
    actualizarPage,
    borrarPage,
    desactivar,
    activar,
    find_by_slug


};