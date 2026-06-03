const { response } = require('express');
const Categoria = require('../models/categoria');
const Producto = require('../models/producto');
const mongoose = require('mongoose');


const getCategorias = async(req, res) => {

    const categorias = await Categoria.find()
    .sort({ createdAt: -1 })
    .populate('nombre img subcategorias');

    res.json({
        ok: true,
        categorias
    });
};

const getCategoria = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Categoria.findById(id)
        .exec((err, categoria) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar categoria',
                    errors: err
                });
            }
            if (!categoria) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El categoria con el id ' + id + 'no existe',
                    errors: { message: 'No existe un categoria con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                categoria: categoria,
                productos: Producto,
            });
        });


    // res.json({
    //     ok: true,
    //     categoria
    //     //uid: req.uid
    // });
};

// function find_by_slug(req, res) {
//     var slug = req.params['slug'];

//     Blog.findOne({ slug: slug })
//     .populate('usuario')
//     .populate('categoria')
//     .populate('binancepay')
//     .populate('pago')
//     .exec((err, blog_data) => {
//         if (err) {
//             res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
//         } else {
//             if (blog_data) {
//                 res.status(200).send({ blog: blog_data });
//             } else {
//                 res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
//             }
//         }
//     });
// }

const crearCategoria = async(req, res) => {
    const uid = req.uid;
    const nombre = req.body.nombre || '';
    // Capturamos el ID de la tienda/local que viene en el body
    const localId = req.body.local; 

    if (!localId) {
        return res.status(400).json({
            ok: false,
            msg: 'El ID del local es obligatorio para crear una categoría.'
        });
    }

    // 1. Generación correcta y segura del SLUG
    const slug = nombre
        .toLowerCase()
        .trim()
        .replace(/ñ/g, 'n')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s]+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');

    try {
        // 2. Validación de unicidad MULTI-TIENDA:
        // Buscamos si YA EXISTE ese slug, pero ESTRICTAMENTE dentro del mismo local
        const existeSlugEnLocal = await Categoria.findOne({ slug: slug, local: localId });
        
        if (existeSlugEnLocal) {
            return res.status(400).json({
                ok: false,
                msg: `En este restaurante ya existe una categoría con un nombre similar (Slug duplicado: ${slug})`
            });
        }

        // 3. Crear la instancia con el slug limpio y el usuario que la crea
        const categoria = new Categoria({
            usuario: uid, // Mantiene la referencia de quién la creó (si lo necesitas)
            ...req.body,
            slug: slug
        });

        const categoriaDB = await categoria.save();

        res.json({
            ok: true,
            categoria: categoriaDB
        });

    } catch (error) {
        console.error(error); // Ideal para debuggear en Vercel/Render
        res.status(500).json({
            ok: false,
            msg: 'Error interno, hable con el admin'
        });
    }
};



const actualizarCategoria = async(req, res) => {
    const id = req.params.id;
    const uid = req.uid;

    try {
        // 1. Verificar existencia del recurso
        const categoria = await Categoria.findById(id);
        if (!categoria) {
            return res.status(404).json({ // Cambiado semánticamente a 404
                ok: false,
                msg: 'Categoría no encontrada por el id'
            });
        }

        const cambiosCategoria = {
            ...req.body,
            usuario: uid
        }

        // 2. Si viene el nombre modificado, recalcular el slug de forma segura
        if (req.body.nombre) {
            const slug = req.body.nombre
                .toLowerCase()
                .trim()
                .replace(/ñ/g, 'n') // Reemplaza la eñe primero
                .normalize('NFD') // Descompone caracteres con acentos
                .replace(/[\u0300-\u036f]/g, '') // Remueve los acentos sueltos
                .replace(/[\s]+/g, '-') // Espacios a guiones
                .replace(/[^\w\-]+/g, '') // Limpia caracteres especiales restantes
                .replace(/\-\-+/g, '-'); // Reduce guiones repetidos

            // 3. Validación de duplicados: Asegurar que nadie más use este slug
            const existeSlug = await Categoria.findOne({ slug, _id: { $ne: id } });
            if (existeSlug) {
                return res.status(400).json({
                    ok: false,
                    msg: `No se puede actualizar. El nombre genera un slug ya existente: ${slug}`
                });
            }

            cambiosCategoria.slug = slug;
        }

        // 4. Ejecutar la actualización en MongoDB Atlas
        const categoriaActualizado = await Categoria.findByIdAndUpdate(id, cambiosCategoria, { new: true });

        res.json({
            ok: true,
            categoriaActualizado
        });

    } catch (error) {
        console.error(error); // Permite registrar el error real para debugging en Render
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};


const borrarCategoria = async(req, res) => {

    const id = req.params.id;

    try {

        const categoria = await Categoria.findById(id);
        if (!categoria) {
            return res.status(500).json({
                ok: false,
                msg: 'categoria no encontrado por el id'
            });
        }

        await Categoria.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'Categoria eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};


function get_car_slide(req, res) {
    Categoria.find({ state_banner: true }).limit(3).exec((err, categoria_data) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (categoria_data) {
                res.status(200).send({ categorias: categoria_data });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });
}


function list_one(req, res) {
    var id = req.params['id'];

    Categoria.findOne({ _id: id }, (err, categoria_data) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (categoria_data) {
                res.status(200).send({ categoria: categoria_data });
            } else {
                res.status(500).send({ message: 'No se encontró ninguna categoria con este ID.' });
            }
        }
    })

}


async function find_by_name(req, res) {
    const termino = req.params['nombre'].toLowerCase().trim();
    // Si puedes enviar el ID del local por query string o headers (ej: req.query.localId) lo capturamos.
    // De lo contrario, hacemos la búsqueda cruzada por categoría:
    const localId = req.query.localId; 

    try {
        // 1. Buscamos la categoría correspondiente
        const categoria = await Categoria.findOne({
            $or: [
                { slug: termino },
                { nombre: { $regex: termino, $options: 'i' } }
            ]
        }); 

        if (!categoria) {
            return res.status(404).json({
                ok: false,
                msg: `Categoría no encontrada con el término: ${termino}`
            });
        }

        // 2. Construimos el filtro dinámico para MongoDB Atlas
        const filtro = { categoria: categoria._id };
        
        // Si desde el frontend nos envían el ID de la tienda activa, filtramos estrictamente por ese local
        if (localId) {
            filtro.local = localId; 
        }

        // 3. Buscamos los platos en la colección de Productos
        const productosAsociados = await Producto.find(filtro)
            .populate('categoria')
            .populate('local'); // Trae la info del restaurante si la necesitas

        res.json({
            ok: true,
            productos: productosAsociados, // <-- Aquí ya viajarán tus pizzas filtradas por local
            categoria: categoria
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin',
            error: error.message
        });
    }
}


function find_by_subcategory(req, res) {
    const id = req.params.id;

    Categoria.findById(id)
        .exec((err, categoria) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar categoria',
                    errors: err
                });
            }
            if (!categoria) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El categoria con el id ' + id + 'no existe',
                    errors: { message: 'No existe un categoria con ese ID' }
                });

            }
            Producto.find({ 
                $or: [
                    { categoria: categoria._id },
                    { subcategoria: id }
                ],
                status: ['Activo'] 
            })
            .populate('categoria')
            .exec((err, productos) => {
                if (err) {
                    return res.status(500).send({ message: 'Error al buscar productos.' });
                }
                res.json({
                    ok: true,
                    categoria: categoria,
                    productos: productos
                });
            });
    });

    
}


const getCategoriasActivos = async(req, res) => {

    Categoria.find({  status: ['Activo'] }).exec((err, categoria_data) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (categoria_data) {
                res.status(200).send({ categorias: categoria_data });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });

};



function desactivar(req, res) {
    var id = req.params['id'];

    Categoria.findByIdAndUpdate({ _id: id }, { status: 'Desactivado' }, (err, categoria_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (categoria_data) {
                res.status(200).send({ categoria: categoria_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el categoria, vuelva a intentar nuevamente.' });
            }
        }
    })
}

function activar(req, res) {
    var id = req.params['id'];
    // console.log(id);
    Categoria.findByIdAndUpdate({ _id: id }, { status: 'Activo' }, (err, categoria_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (categoria_data) {
                res.status(200).send({ categoria: categoria_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el categoria, vuelva a intentar nuevamente.' });
            }
        }
    })
}



const getCategoriasByLocal = async (req, res) => {
    const { localId } = req.params;

    try {
        

        // 🟢 1. Forzamos la conversión nativa a ObjectId
        const localObjectId = new mongoose.Types.ObjectId(localId);

        // 🟢 2. Buscamos de forma directa SIN usar .populate() para evitar que se cuelgue Express
        const categorias = await Categoria.find({ local: localObjectId })
        .sort({ createdAt: -1 }).lean(); // lean() devuelve objetos JS simples, no documentos Mongoose

        return res.json({
            ok: true,
            categorias
        });

    } catch (error) {
        console.error('-> API ERROR CRÍTICO:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Error en el servidor al cargar categorías por local'
        });
    }
};





module.exports = {
    getCategorias,
    crearCategoria,
    actualizarCategoria,
    borrarCategoria,
    getCategoria,
    get_car_slide,
    list_one,
    find_by_name,
    find_by_subcategory,
    getCategoriasActivos,
    desactivar,
    activar,
    getCategoriasByLocal
};