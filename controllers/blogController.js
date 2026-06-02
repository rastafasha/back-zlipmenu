const { response } = require('express');
const Blog = require('../models/blog');
const Categoria = require('../models/categoria');
const fs = require('fs');


const getBlogs = async(req, res) => {

    const blogs = await Blog.find()
    .sort({ createdAt: -1 })
    .populate('titulo img categoria');

    res.json({
        ok: true,
        blogs
    });
};

const getBlog = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Blog.findById(id).populate('titulo img categoria')
        .exec((err, blog) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar blog',
                    errors: err
                });
            }
            if (!blog) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El blog con el id ' + id + 'no existe',
                    errors: { message: 'No existe un blog con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                blog: blog
            });
        });

};
function find_by_slug(req, res) {
    var slug = req.params['slug'];

    Blog.findOne({ slug: slug }).exec((err, blog_data) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (blog_data) {
                res.status(200).send({ blog: blog_data });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });
}

const crearBlog = async(req, res) => {
    const uid = req.uid;
    const titulo = req.body.titulo || '';

    // 1. Generación del SLUG perfecta para el SEO de tus artículos
    const slug = titulo
        .toLowerCase()
        .trim()
        .replace(/ñ/g, 'n') // Reemplaza la eñe primero
        .normalize('NFD') // Descompone caracteres acentuados
        .replace(/[\u0300-\u036f]/g, '') // Remueve acentos sueltos
        .replace(/[\s]+/g, '-') // Espacios a guiones
        .replace(/[^\w\-]+/g, '') // Limpia caracteres especiales restantes
        .replace(/\-\-+/g, '-'); // Reduce guiones múltiples a uno solo

    // 2. Extracción segura de los primeros 100 caracteres para el resumen
    const descripcion = req.body.descripcion || '';
    const short_descripcion_limit = descripcion.substring(0, 100);

    try {
        // 3. Validación de unicidad: Evita que dos artículos tengan la misma URL
        const existeSlug = await Blog.findOne({ slug });
        if (existeSlug) {
            return res.status(400).json({
                ok: false,
                msg: `Ya existe un artículo de blog con un título similar (Slug duplicado: ${slug})`
            });
        }

        // 4. Crear la instancia e indexar en la base de datos
        const blog = new Blog({
            usuario: uid,
            ...req.body,
            slug: slug,
            short_descripcion: short_descripcion_limit
        });

        const blogDB = await blog.save();

        res.json({
            ok: true,
            blog: blogDB
        });

    } catch (error) {
        console.error('Error al crear artículo de blog:', error); // Logs listos para Render
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin',
            error: error.message
        });
    }
};

const actualizarBlog = async(req, res) => {
    const id = req.params.id;
    const uid = req.uid;

    try {
        // 1. Verificar si el artículo de blog existe
        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({ // Cambiado semánticamente a 404 (Not Found)
                ok: false,
                msg: 'Artículo de blog no encontrado por el id'
            });
        }

        const cambiosBlog = {
            ...req.body,
            usuario: uid
        }

        // 2. Si viene el título modificado, recalcular el slug de forma segura
        if (req.body.titulo) {
            const slug = req.body.titulo
                .toLowerCase()
                .trim()
                .replace(/ñ/g, 'n') // Reemplaza la eñe primero
                .normalize('NFD') // Descompone caracteres con acentos
                .replace(/[\u0300-\u036f]/g, '') // Remueve acentos sueltos
                .replace(/[\s]+/g, '-') // Espacios a guiones
                .replace(/[^\w\-]+/g, '') // Limpia caracteres especiales restantes
                .replace(/\-\-+/g, '-'); // Reduce guiones repetidos

            // 3. Validación de duplicados: Evitar colisión de URLs con otros artículos
            const existeSlug = await Blog.findOne({ slug, _id: { $ne: id } });
            if (existeSlug) {
                return res.status(400).json({
                    ok: false,
                    msg: `No se puede actualizar. El título genera un slug ya existente: ${slug}`
                });
            }

            cambiosBlog.slug = slug;
        }

        // 4. Si viene la descripción modificada, actualizar el resumen corto de forma segura
        if (req.body.descripcion) {
            const short_descripcion = req.body.descripcion || '';
            const short_descripcion_limit = short_descripcion.substring(0, 100);
            cambiosBlog.short_descripcion = short_descripcion_limit;
        }

        // 5. Ejecutar la actualización en MongoDB Atlas
        const blogActualizado = await Blog.findByIdAndUpdate(id, cambiosBlog, { new: true });

        res.json({
            ok: true,
            blogActualizado
        });

    } catch (error) {
        console.error('Error al actualizar artículo de blog:', error); // Logs listos para Render
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin',
            error: error.message
        });
    }
};


const borrarBlog = async(req, res) => {

    const id = req.params.id;

    try {

        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(500).json({
                ok: false,
                msg: 'blog no encontrado por el id'
            });
        }

        await Blog.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'blog eliminado'
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

    Blog.findByIdAndUpdate({ _id: id }, { status: 'Desactivado' }, (err, blog_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (blog_data) {
                res.status(200).send({ blog: blog_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el blog, vuelva a intentar nuevamente.' });
            }
        }
    })
}

function activar(req, res) {
    var id = req.params['id'];
    // console.log(id);
    Blog.findByIdAndUpdate({ _id: id }, { status: 'Activo' }, (err, blog_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (blog_data) {
                res.status(200).send({ blog: blog_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el blog, vuelva a intentar nuevamente.' });
            }
        }
    })
}


const getPostsActivos = async(req, res) => {

    Blog.find({  status: ['Activo'] }).populate('categoria').exec((err, blogs) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (blogs) {
                res.status(200).send({ blogs: blogs });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });

};

const getPostsActivosDestacados = async(req, res) => {

    Blog.find({  status: ['Activo'], isFeatured:true }).populate('categoria').exec((err, blogs) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (blogs) {
                res.status(200).send({ blogs: blogs });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });

};





module.exports = {
    getBlogs,
    crearBlog,
    getBlog,
    actualizarBlog,
    borrarBlog,
    desactivar,
    activar,
    find_by_slug,
    getPostsActivos,
    getPostsActivosDestacados


};