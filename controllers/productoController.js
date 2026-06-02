const { response } = require('express');
const Producto = require('../models/producto');
const Marca = require('../models/marca');
const Categoria = require('../models/categoria');
const Selector = require('../models/selector');
const Color = require('../models/color');
const fs = require('fs');
const { randomInt } = require('crypto');
const path = require('path');

// Internal function to reduce stock programmatically
async function reducir_stock_internal(productoId, cantidad) {
    try {
        const producto = await Producto.findById(productoId);
        if (producto) {
            producto.stock = producto.stock - cantidad;
            if (producto.stock < 0) producto.stock = 0;
            await producto.save();
            return producto;
        } else {
            throw new Error('Producto no encontrado');
        }
    } catch (error) {
        console.error('Error reducing stock:', error);
        throw error;
    }
}


function listarAdmin(req, res) {

    var filtro = req.params['filtro'];
    Producto.find({
        titulo: new RegExp(filtro, 'i'),
        status: ['Activo', 'Desactivado', 'Edición'],
    }, ).populate('marca')
    .populate('categoria')
    .populate('local')
    .populate('color')
    .populate('selector')
    .sort({ createdAt: -1 }).exec((err, producto_data) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (producto_data) {
                res.status(200).send({ productos: producto_data });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });
}


const getProductos = async(req, res) => {

    const productos = await Producto.find()
    .sort({ createdAt: -1 })
    .populate('titulo img categoria color selector');

    res.json({
        ok: true,
        productos
    });
};

const getProductosActivos = async(req, res) => {

    Producto.find({ status: ['Activo'] })
    .populate('categoria')
    .populate('color')
    .sort({ createdAt: -1 })
    .exec((err, productos) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (productos) {
                res.status(200).send({ productos: productos });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });

};

const destacado = async(req, res) => {

    Producto.find({  isFeatured: ['true'], status: ['Activo'] }).populate('categoria').exec((err, productos) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (productos) {
                // Shuffle the array
                const shuffled = productos.sort(() => 0.5 - Math.random());
                // Take first 4
                const randomProductos = shuffled.slice(0, 4);
                res.status(200).send({ productos: randomProductos });

                // res.status(200).send({ productos: productos });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });
};

const getProducto = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Producto.findById(id)
        .populate('color')
        .populate('selector')
        .populate('categoria')
        .exec((err, producto) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar producto',
                    errors: err
                });
            }
            if (!producto) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El producto con el id ' + id + 'no existe',
                    errors: { message: 'No existe un producto con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                producto: producto
            });
        });

};

const getProductoSlug = async(req, res) => {

    const slug = req.params.slug;
    const uid = req.uid;

    Producto.find_by_slug(slug)
        .populate('color')
        .exec((err, producto) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar producto',
                    errors: err
                });
            }
            if (!producto) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El producto con el slug ' + slug + 'no existe',
                    errors: { message: 'No existe un producto con ese slug' }
                });

            }
            res.status(200).json({
                ok: true,
                producto: producto
            });
        });

};

const getProductosTiendaId = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Producto.find({ local: id })
        .populate('local')
        .populate('categoria')
        .sort({ createdAt: -1 })
        .exec((err, productos) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar producto',
                    errors: err
                });
            }
            if (!productos) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El producto con el id ' + id + ' no existe',
                    errors: { message: 'No existe un producto con ese id' }
                });

            }
            res.status(200).json({
                ok: true,
                productos: productos
            });
        });

};

const getProductosTiendaIdActive = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Producto.find({ local: id }, {  status: ['Activo'] })
        .populate('local')
        .populate('categoria')
        .sort({ createdAt: -1 })
        .exec((err, productos) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar producto',
                    errors: err
                });
            }
            if (!productos) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El producto con el id ' + id + ' no existe',
                    errors: { message: 'No existe un producto con ese id' }
                });

            }
            res.status(200).json({
                ok: true,
                productos: productos
            });
        });

};

const crearProducto = async(req, res) => {
    const uid = req.uid;
    const titulo = req.body.titulo || '';
    const idLocal = req.body.local; // ID de la tienda a la que pertenece el producto

    // 1. Generación correcta y segura del SLUG sin pérdida de caracteres
    const slug = titulo
        .toLowerCase()
        .trim()
        .replace(/ñ/g, 'n') // Reemplaza la eñe primero
        .normalize('NFD') // Descompone caracteres acentuados
        .replace(/[\u0300-\u036f]/g, '') // Elimina los símbolos de acentos sueltos
        .replace(/[\s]+/g, '-') // Espacios a guiones
        .replace(/[^\w\-]+/g, '') // Limpia caracteres especiales restantes [5]
        .replace(/\-\-+/g, '-'); // Reduce guiones múltiples a uno solo [5]

    try {
        // 2. Validación de unicidad inteligente (Multi-Tenant)
        // Permite que "Tienda A" y "Tienda B" tengan una "margherita", 
        // pero evita que la misma tienda duplique el mismo plato.
        if (idLocal) {
            const existeProductoEnLocal = await Producto.findOne({ slug, local: idLocal });
            if (existeProductoEnLocal) {
                return res.status(400).json({
                    ok: false,
                    msg: `Este restaurante ya tiene un producto registrado con un nombre similar (Slug duplicado: ${slug})`
                });
            }
        }

        // 3. Crear la instancia con el slug limpio
        const producto = new Producto({
            usuario: uid,
            ...req.body,
            slug: slug // Asegura pisar cualquier slug corrupto enviado en el body
        });

        const productoDB = await producto.save();

        res.json({
            ok: true,
            producto: productoDB
        });

    } catch (error) {
        console.error('Error al crear producto:', error); // Rastro visible en los logs de Render
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin',
            error: error.message
        });
    }
};

const actualizarProducto = async(req, res) => {
    const id = req.params.id;
    const uid = req.uid;

    try {
        // 1. Verificar si el producto existe
        const producto = await Producto.findById(id);
        if (!producto) {
            return res.status(404).json({ // Cambiado semánticamente a 404 (Not Found)
                ok: false,
                msg: 'Producto no encontrado por el id'
            });
        }

        const cambiosProducto = {
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

            // 3. Validación Multi-Tenant: El slug debe ser único dentro del mismo local
            // Usamos el ID del local que viene en el body, o el que ya tenía el producto guardado
            const idLocal = req.body.local || producto.local;

            if (idLocal) {
                const existeProductoEnLocal = await Producto.findOne({ 
                    slug, 
                    local: idLocal,
                    _id: { $ne: id } // Excluye el producto actual para evitar falsos positivos
                });

                if (existeProductoEnLocal) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No se puede actualizar. Ya existe otro producto en este restaurante con un nombre similar (Slug: ${slug})`
                    });
                }
            }

            cambiosProducto.slug = slug;
        }

        // 4. Ejecutar la actualización en MongoDB Atlas
        const productoActualizado = await Producto.findByIdAndUpdate(id, cambiosProducto, { new: true });

        res.json({
            ok: true,
            productoActualizado
        });

    } catch (error) {
        console.error('Error al actualizar producto:', error); // Logs listos para producción en Render
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin',
            error: error.message
        });
    }
};


const borrarProducto = async(req, res) => {

    const id = req.params.id;

    try {

        const producto = await Producto.findById(id);
        if (!producto) {
            return res.status(500).json({
                ok: false,
                msg: 'producto no encontrado por el id'
            });
        }

        await Producto.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'Producto eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};


function find_by_slug(req, res) {
    var slug = req.params['slug'];

    Producto.findOne({ slug: slug })
    .populate('marca')
    .populate('color')
    .populate('selector')
    .exec((err, producto_data) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (producto_data) {
                res.status(200).send({ producto: producto_data });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });
}


async function find_by_brandig(req, res) {
    try {
        const brandSlugOrName = req.params['slug'] || req.params['marca'] ;

        if (!brandSlugOrName) {
            return res.status(400).send({ message: 'Marca no especificada en los parámetros.' });
        }

        // Buscar la marca por slug o nombre (case insensitive)
        const brand = await Marca.findOne({
            $or: [
                { slug: brandSlugOrName.toLowerCase() },
                { nombre: new RegExp('^' + brandSlugOrName + '$', 'i') }
            ]
        });

        if (!brand) {
            return res.status(404).send({ message: 'Marca no encontrada.' });
        }

        // Buscar productos con la marca encontrada
        const productos = await Producto.find({ marca: brand._id, status: ['Activo'] })
            .populate('marca')
            .exec();

        if (productos.length > 0) {
            return res.status(200).send({ productos: productos });
        } else {
            return res.status(404).send({ message: 'No se encontraron productos para esta marca.' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send({ message: 'Error en el servidor.' });
    }
}


function listar_newest(req, res) {
    Producto.find({ status: ['Activo'] })
    .populate('categoria')
    .exec((err, productos) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (productos) {
                // Shuffle the array
                const shuffled = productos.sort(() => 0.5 - Math.random());
                // Take first 4
                const randomProductos = shuffled.slice(0, 4);
                res.status(200).send({ productos: randomProductos });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });
}

function listar_best_sellers(req, res) {
    Producto.find().sort({ ventas: -1 }).limit(8).exec((err, data) => {
        if (data) {
            res.status(200).send({ data: data });
        }
    });
}

function listar_best_sellers_local(req, res) {
     const id = req.params.id;
    Producto.find({local:id}).sort({ ventas: -1 }).limit(8).exec((err, data) => {
        if (data) {
            res.status(200).send({ data: data });
        }
    });
}

function listar_populares(req, res) {
    Producto.find().sort({ stars: -1 }).limit(4).exec((err, data) => {
        if (data) {
            res.status(200).send({ data: data });
        }
    });
}

function listar_populares_local(req, res) {
    const id = req.params.id;
    Producto.find({local:id}).sort({ stars: -1 }).limit(4).exec((err, data) => {
        if (data) {
            res.status(200).send({ data: data });
        }
    });
}

function listar_papelera(req, res) {

    var search = req.params['search'];

    Producto.find({ titulo: new RegExp(search, 'i'), status: 'Papelera' }).populate('marca').populate('categoria').exec((err, producto_data) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (producto_data) {
                // console.log(producto_data);

                res.status(200).send({ productos: producto_data });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });
}

//categoria
const cat_by_name = async(req, res) => {
    try {
        var nombre = req.params['nombre'];

        // First, find the category by name to get its ObjectId
        
        const categoria = await Categoria.findOne({ nombre: new RegExp('^' + nombre + '$', 'i') });


        if (!categoria) {
            return res.status(404).send({ message: 'Categoría no encontrada.' });
        }

        // Then find products with that category ObjectId
        const productos = await Producto.find({ categoria: categoria._id, status: ['Activo'] })
            .populate('categoria')
            .populate('marca')
            .populate('color')
            .populate('selector')
            .exec();

        if (productos && productos.length > 0) {
            res.status(200).send({ productos: productos });
        } else {
            res.status(404).send({ message: 'No se encontraron productos para esta categoría.' });
        }
    } catch (error) {
        console.error('Error in cat_by_name:', error);
        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
    }
}

function listar_cat(req, res) {
    var filtro = req.params['filtro'];

    Producto.find({ categoria: filtro, status: ['Activo', 'Desactivado', 'Edición'] }).populate('marca').populate('categoria').exec((err, producto_data) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (producto_data) {
                res.status(200).send({ productos: producto_data });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });
}

function listar_cat_papelera(req, res) {
    var filtro = req.params['filtro'];

    Producto.find({ categoria: filtro, status: ['Papelera'] }).populate('marca').populate('categoria').exec((err, producto_data) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (producto_data) {
                res.status(200).send({ productos: producto_data });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });
}

//estes es el que funciona!!
function listar_productosCateg(req, res) {

    const id = req.params.id;

    Producto.find({ categoria: id, status: ['Activo']  })
    .populate('categoria')
    .exec((err, producto_data) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (producto_data) {
                res.status(200).send({ productos: producto_data });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });

}

function listar_productosCategNombre(req, res) {

    const nombre = req.params.nombre;

    Producto.find({ categoria: nombre, status: ['Activo']  })
    .populate('categoria')
    .exec((err, productos) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (productos) {
                res.status(200).send({ productos: productos });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });

}

//categoria

function desactivar(req, res) {
    var id = req.params['id'];

    Producto.findByIdAndUpdate({ _id: id }, { status: 'Desactivado' }, (err, producto_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (producto_data) {
                res.status(200).send({ producto: producto_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el producto, vuelva a intentar nuevamente.' });
            }
        }
    })
}

function activar(req, res) {
    var id = req.params['id'];
    // console.log(id);
    Producto.findByIdAndUpdate({ _id: id }, { status: 'Activo' }, (err, producto_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (producto_data) {
                res.status(200).send({ producto: producto_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el producto, vuelva a intentar nuevamente.' });
            }
        }
    })
}


function papelera(req, res) {
    var id = req.params['id'];

    Producto.findByIdAndUpdate({ _id: id }, { status: 'Papelera' }, (err, producto_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (producto_data) {
                res.status(200).send({ producto: producto_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el producto, vuelva a intentar nuevamente.' });
            }
        }
    })
}

function reducir_stock(req, res) {
    var id = req.params['id'];
    var cantidad = req.params['cantidad'];

    Producto.findById({ _id: id }, (err, producto) => {

        if (producto) {
            Producto.findByIdAndUpdate({ _id: id }, { stock: parseInt(producto.stock) - parseInt(cantidad) }, (err, data) => {
                if (data) {
                    // console.log(data);
                    res.status(200).send({ data: data });
                } else {
                    // console.log(err);
                    res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                }
            })
        }
    })
}

function aumentar_stock(req, res) {
    var id = req.params['id'];
    var cantidad = req.params['cantidad'];

    Producto.findById({ _id: id }, (err, producto) => {

        if (producto) {
            Producto.findByIdAndUpdate({ _id: id }, { stock: parseInt(producto.stock) + parseInt(cantidad) }, (err, data) => {
                if (data) {
                    // console.log(data);
                    res.status(200).send({ data: data });
                } else {
                    // console.log(err);
                    res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                }
            })
        }
    })
}

function aumentar_venta(req, res) {
    var id = req.params['id'];

    Producto.findById({ _id: id }, (err, producto) => {

        if (producto) {
            Producto.findByIdAndUpdate({ _id: id }, { ventas: parseInt(producto.ventas) + 1 }, (err, data) => {
                if (data) {
                    // console.log(data);
                    res.status(200).send({ data: data });
                } else {
                    // console.log(err);
                    res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                }
            })
        }
    })
}


const listar_autocomplete = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Producto.find({ status: ['Activo'], }, ).populate('marca').populate('categoria').sort({ createdAt: -1 }).exec((err, producto_data) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (producto_data) {
                res.status(200).send({ data: producto_data });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });

};


function listar_general_data(req, res) {
    var filtro = req.params['filtro'];

    Producto.find({ titulo: new RegExp(filtro, 'i') }).populate('marca').populate('categoria').sort({ createdAt: -1 }).exec((err, producto_data) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (producto_data) {
                // console.log(producto_data);
                // res.status(200).send({ data: producto_data });
                res.status(200).json({
                    ok: true,
                    producto_data
                });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });
}




function listar_productosColor(req, res) {

    const id = req.params.id;

    Producto.find({ color: id })
    .populate('color')
    .exec((err, producto_data) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (producto_data) {
                res.status(200).send({ productos: producto_data });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });

}

function list_one(req, res) {
    var id = req.params['id'];

    Producto.findOne({ _id: id }).exec((err, producto_data) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (producto_data) {
                res.status(200).send({ producto: producto_data });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });

}


function ecoomerce(req, res) {
    var filtro = req.params['filtro'];
    var min = req.params['min'];
    var max = req.params['max'];
    var sub = req.params['sub'];
    var cat = req.params['cat'];
    var orden = req.params['orden'];
    var marca = req.params['marca'];


    if (min == undefined) {
        min = 0;
    }
    if (max == undefined) {
        max = 1000;
    }

    console.log(marca);

    // /productos
    if (sub == undefined || sub == ' ') {
        console.log('1');

        if (orden == 'asc') {
            if (marca == 'undefined') {
                Producto.find({
                    titulo: new RegExp(filtro, 'i'),
                    status: ['Activo'],
                    precio_ahora: { $gte: min, $lte: max },

                }, ).populate('marca').populate('categoria').sort({ titulo: 1 }).exec((err, producto_data) => {
                    if (err) {
                        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                    } else {
                        if (producto_data) {


                            res.status(200).send({ productos: producto_data });
                        } else {
                            res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                        }
                    }
                });
            } else {
                Producto.find({
                    titulo: new RegExp(filtro, 'i'),
                    status: ['Activo'],
                    precio_ahora: { $gte: min, $lte: max },
                    marca: marca
                }, ).populate('marca').populate('categoria').sort({ titulo: 1 }).exec((err, producto_data) => {
                    if (err) {
                        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                    } else {
                        if (producto_data) {


                            res.status(200).send({ productos: producto_data });
                        } else {
                            res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                        }
                    }
                });
            }
        } else if (orden == 'desc') {
            if (marca == 'undefined') {
                Producto.find({
                    titulo: new RegExp(filtro, 'i'),
                    status: ['Activo'],
                    precio_ahora: { $gte: min, $lte: max },
                }, ).populate('marca').populate('categoria').sort({ titulo: -1 }).exec((err, producto_data) => {
                    if (err) {
                        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                    } else {
                        if (producto_data) {
                            res.status(200).send({ productos: producto_data });
                        } else {
                            res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                        }
                    }
                });
            } else {
                Producto.find({
                    titulo: new RegExp(filtro, 'i'),
                    status: ['Activo'],
                    precio_ahora: { $gte: min, $lte: max },
                    marca: marca
                }, ).populate('marca').populate('categoria').sort({ titulo: -1 }).exec((err, producto_data) => {
                    if (err) {
                        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                    } else {
                        if (producto_data) {
                            res.status(200).send({ productos: producto_data });
                        } else {
                            res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                        }
                    }
                });
            }
        } else if (orden == 'rating') {
            if (marca == 'undefined') {
                Producto.find({
                    titulo: new RegExp(filtro, 'i'),
                    status: ['Activo'],
                    precio_ahora: { $gte: min, $lte: max },
                }, ).populate('marca').populate('categoria').sort({ rating: -1 }).exec((err, producto_data) => {
                    if (err) {
                        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                    } else {
                        if (producto_data) {
                            res.status(200).send({ productos: producto_data });
                        } else {
                            res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                        }
                    }
                });
            } else {
                Producto.find({
                    titulo: new RegExp(filtro, 'i'),
                    status: ['Activo'],
                    precio_ahora: { $gte: min, $lte: max },
                    marca: marca
                }, ).populate('marca').populate('categoria').sort({ rating: -1 }).exec((err, producto_data) => {
                    if (err) {
                        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                    } else {
                        if (producto_data) {
                            res.status(200).send({ productos: producto_data });
                        } else {
                            res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                        }
                    }
                });
            }
        } else if (orden == 'lower') {
            if (marca == 'undefined') {
                Producto.find({
                    titulo: new RegExp(filtro, 'i'),
                    status: ['Activo'],
                    precio_ahora: { $gte: min, $lte: max },
                }, ).populate('marca').populate('categoria').sort({ precio_ahora: 1 }).exec((err, producto_data) => {
                    if (err) {
                        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                    } else {
                        if (producto_data) {
                            res.status(200).send({ productos: producto_data });
                        } else {
                            res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                        }
                    }
                });
            } else {
                Producto.find({
                    titulo: new RegExp(filtro, 'i'),
                    status: ['Activo'],
                    precio_ahora: { $gte: min, $lte: max },
                    marca: marca
                }, ).populate('marca').populate('categoria').sort({ precio_ahora: 1 }).exec((err, producto_data) => {
                    if (err) {
                        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                    } else {
                        if (producto_data) {
                            res.status(200).send({ productos: producto_data });
                        } else {
                            res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                        }
                    }
                });
            }
        } else if (orden == 'major') {
            if (marca == 'undefined') {
                Producto.find({
                    titulo: new RegExp(filtro, 'i'),
                    status: ['Activo'],
                    precio_ahora: { $gte: min, $lte: max },
                }, ).populate('marca').populate('categoria').sort({ precio_ahora: -1 }).exec((err, producto_data) => {
                    if (err) {
                        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                    } else {
                        if (producto_data) {
                            res.status(200).send({ productos: producto_data });
                        } else {
                            res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                        }
                    }
                });
            } else {
                Producto.find({
                    titulo: new RegExp(filtro, 'i'),
                    status: ['Activo'],
                    precio_ahora: { $gte: min, $lte: max },
                    marca: marca
                }, ).populate('marca').populate('categoria').sort({ precio_ahora: -1 }).exec((err, producto_data) => {
                    if (err) {
                        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                    } else {
                        if (producto_data) {
                            res.status(200).send({ productos: producto_data });
                        } else {
                            res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                        }
                    }
                });
            }
        } else if (orden == 'date') {

            if (marca == 'undefined') {
                console.log("marc unde");

                Producto.find({
                    titulo: new RegExp(filtro, 'i'),
                    status: ['Activo'],
                    precio_ahora: { $gte: min, $lte: max },

                }, ).populate('marca').populate('categoria').sort({ createdAt: -1 }).exec((err, producto_data) => {
                    if (err) {
                        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                    } else {
                        if (producto_data) {
                            res.status(200).send({ productos: producto_data });
                        } else {
                            res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                        }
                    }
                });
            } else {

                Producto.find({
                    titulo: new RegExp(filtro, 'i'),
                    status: ['Activo'],
                    precio_ahora: { $gte: min, $lte: max },
                    marca: marca
                }, ).populate('marca').populate('categoria').sort({ createdAt: -1 }).exec((err, producto_data) => {
                    if (err) {
                        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                    } else {
                        if (producto_data) {
                            res.status(200).send({ productos: producto_data });
                        } else {
                            res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                        }
                    }
                });
            }
        } else {
            console.log("todoooooo");
            console.log(filtro);
            Producto.find({
                titulo: new RegExp(filtro, 'i'),
                status: ['Activo'],
                precio_ahora: { $gte: min, $lte: max },

            }, ).populate('marca').populate('categoria').sort({ createdAt: -1 }).exec((err, producto_data) => {
                if (err) {
                    res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                } else {
                    if (producto_data) {
                        res.status(200).send({ productos: producto_data });

                    } else {
                        res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                    }
                }
            });
        }
    } else {
        console.log('subcategorias');

        if (sub == "todo") {
            console.log(orden);

            if (orden == 'asc') {
                console.log('asc sort');
                if (marca == 'undefined') {
                    Producto.find({
                        titulo: new RegExp(filtro, 'i'),
                        status: ['Activo'],
                        precio_ahora: { $gte: min, $lte: max },
                        categoria: cat,

                    }, ).populate('marca').populate('categoria').sort({ titulo: 1 }).exec((err, producto_data) => {
                        if (err) {
                            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                        } else {
                            if (producto_data) {
                                res.status(200).send({ productos: producto_data });
                            } else {
                                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                            }
                        }
                    });
                } else {
                    Producto.find({
                        titulo: new RegExp(filtro, 'i'),
                        status: ['Activo'],
                        precio_ahora: { $gte: min, $lte: max },
                        categoria: cat,
                        marca: marca
                    }, ).populate('marca').populate('categoria').sort({ titulo: 1 }).exec((err, producto_data) => {
                        if (err) {
                            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                        } else {
                            if (producto_data) {
                                res.status(200).send({ productos: producto_data });
                            } else {
                                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                            }
                        }
                    });
                }
            } else if (orden == 'desc') {
                if (marca == 'undefined') {
                    Producto.find({
                        titulo: new RegExp(filtro, 'i'),
                        status: ['Activo'],
                        precio_ahora: { $gte: min, $lte: max },
                        categoria: cat,

                    }, ).populate('marca').populate('categoria').sort({ titulo: -1 }).exec((err, producto_data) => {
                        if (err) {
                            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                        } else {
                            if (producto_data) {
                                res.status(200).send({ productos: producto_data });
                            } else {
                                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                            }
                        }
                    });
                } else {
                    Producto.find({
                        titulo: new RegExp(filtro, 'i'),
                        status: ['Activo'],
                        precio_ahora: { $gte: min, $lte: max },
                        categoria: cat,
                        marca: marca
                    }, ).populate('marca').populate('categoria').sort({ titulo: -1 }).exec((err, producto_data) => {
                        if (err) {
                            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                        } else {
                            if (producto_data) {
                                res.status(200).send({ productos: producto_data });
                            } else {
                                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                            }
                        }
                    });
                }
            } else if (orden == 'rating') {
                if (marca == 'undefined') {
                    Producto.find({
                        titulo: new RegExp(filtro, 'i'),
                        status: ['Activo'],
                        precio_ahora: { $gte: min, $lte: max },
                        categoria: cat,
                    }, ).populate('marca').populate('categoria').sort({ rating: -1 }).exec((err, producto_data) => {
                        if (err) {
                            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                        } else {
                            if (producto_data) {
                                res.status(200).send({ productos: producto_data });
                            } else {
                                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                            }
                        }
                    });
                } else {
                    Producto.find({
                        titulo: new RegExp(filtro, 'i'),
                        status: ['Activo'],
                        precio_ahora: { $gte: min, $lte: max },
                        categoria: cat,
                        marca: marca
                    }, ).populate('marca').populate('categoria').sort({ rating: -1 }).exec((err, producto_data) => {
                        if (err) {
                            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                        } else {
                            if (producto_data) {
                                res.status(200).send({ productos: producto_data });
                            } else {
                                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                            }
                        }
                    });
                }
            } else if (orden == 'lower') {
                if (marca == 'undefined') {
                    Producto.find({
                        titulo: new RegExp(filtro, 'i'),
                        status: ['Activo'],
                        precio_ahora: { $gte: min, $lte: max },
                        categoria: cat,
                    }, ).populate('marca').populate('categoria').sort({ precio_ahora: 1 }).exec((err, producto_data) => {
                        if (err) {
                            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                        } else {
                            if (producto_data) {
                                res.status(200).send({ productos: producto_data });
                            } else {
                                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                            }
                        }
                    });
                } else {
                    Producto.find({
                        titulo: new RegExp(filtro, 'i'),
                        status: ['Activo'],
                        precio_ahora: { $gte: min, $lte: max },
                        categoria: cat,
                        marca: marca
                    }, ).populate('marca').populate('categoria').sort({ precio_ahora: 1 }).exec((err, producto_data) => {
                        if (err) {
                            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                        } else {
                            if (producto_data) {
                                res.status(200).send({ productos: producto_data });
                            } else {
                                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                            }
                        }
                    });
                }
            } else if (orden == 'major') {
                if (marca == 'undefined') {
                    Producto.find({
                        titulo: new RegExp(filtro, 'i'),
                        status: ['Activo'],
                        precio_ahora: { $gte: min, $lte: max },
                        categoria: cat,
                    }, ).populate('marca').populate('categoria').sort({ precio_ahora: -1 }).exec((err, producto_data) => {
                        if (err) {
                            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                        } else {
                            if (producto_data) {
                                res.status(200).send({ productos: producto_data });
                            } else {
                                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                            }
                        }
                    });
                } else {
                    Producto.find({
                        titulo: new RegExp(filtro, 'i'),
                        status: ['Activo'],
                        precio_ahora: { $gte: min, $lte: max },
                        categoria: cat,
                        marca: marca
                    }, ).populate('marca').populate('categoria').sort({ precio_ahora: -1 }).exec((err, producto_data) => {
                        if (err) {
                            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                        } else {
                            if (producto_data) {
                                res.status(200).send({ productos: producto_data });
                            } else {
                                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                            }
                        }
                    });
                }
            } else if (orden == 'date') {
                if (marca == 'undefined') {
                    Producto.find({
                        titulo: new RegExp(filtro, 'i'),
                        status: ['Activo'],
                        precio_ahora: { $gte: min, $lte: max },
                        categoria: cat
                    }, ).populate('marca').populate('categoria').sort({ createdAt: -1 }).exec((err, producto_data) => {
                        if (err) {
                            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                        } else {
                            if (producto_data) {
                                res.status(200).send({ productos: producto_data });
                            } else {
                                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                            }
                        }
                    });
                } else {
                    Producto.find({
                        titulo: new RegExp(filtro, 'i'),
                        status: ['Activo'],
                        precio_ahora: { $gte: min, $lte: max },
                        categoria: cat,
                        marca: marca
                    }, ).populate('marca').populate('categoria').sort({ createdAt: -1 }).exec((err, producto_data) => {
                        if (err) {
                            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                        } else {
                            if (producto_data) {
                                res.status(200).send({ productos: producto_data });
                            } else {
                                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                            }
                        }
                    });
                }
            } else {
                Producto.find({
                    titulo: new RegExp(filtro, 'i'),
                    status: ['Activo'],
                    precio_ahora: { $gte: min, $lte: max },
                    categoria: cat
                }, ).populate('marca').populate('categoria').sort({ createdAt: -1 }).exec((err, producto_data) => {
                    if (err) {
                        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                    } else {
                        if (producto_data) {
                            res.status(200).send({ productos: producto_data });
                        } else {
                            res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                        }
                    }
                });
            }
        } else {
            if (orden == 'asc') {
                Producto.find({
                    titulo: new RegExp(filtro, 'i'),
                    status: ['Activo'],
                    precio_ahora: { $gte: min, $lte: max },
                    subcategoria: new RegExp(sub, 'i')
                }, ).populate('marca').populate('categoria').sort({ titulo: 1 }).exec((err, producto_data) => {
                    if (err) {
                        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                    } else {
                        if (producto_data) {
                            res.status(200).send({ productos: producto_data });
                        } else {
                            res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                        }
                    }
                });
            } else if (orden == 'desc') {
                Producto.find({
                    titulo: new RegExp(filtro, 'i'),
                    status: ['Activo'],
                    precio_ahora: { $gte: min, $lte: max },
                    subcategoria: new RegExp(sub, 'i')
                }, ).populate('marca').populate('categoria').sort({ titulo: -1 }).exec((err, producto_data) => {
                    if (err) {
                        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                    } else {
                        if (producto_data) {
                            res.status(200).send({ productos: producto_data });
                        } else {
                            res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                        }
                    }
                });
            } else if (orden == 'rating') {
                Producto.find({
                    titulo: new RegExp(filtro, 'i'),
                    status: ['Activo'],
                    precio_ahora: { $gte: min, $lte: max },
                    subcategoria: new RegExp(sub, 'i')
                }, ).populate('marca').populate('categoria').sort({ rating: -1 }).exec((err, producto_data) => {
                    if (err) {
                        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                    } else {
                        if (producto_data) {
                            res.status(200).send({ productos: producto_data });
                        } else {
                            res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                        }
                    }
                });
            } else if (orden == 'lower') {
                Producto.find({
                    titulo: new RegExp(filtro, 'i'),
                    status: ['Activo'],
                    precio_ahora: { $gte: min, $lte: max },
                    subcategoria: new RegExp(sub, 'i')
                }, ).populate('marca').populate('categoria').sort({ precio_ahora: 1 }).exec((err, producto_data) => {
                    if (err) {
                        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                    } else {
                        if (producto_data) {
                            res.status(200).send({ productos: producto_data });
                        } else {
                            res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                        }
                    }
                });
            } else if (orden == 'major') {
                Producto.find({
                    titulo: new RegExp(filtro, 'i'),
                    status: ['Activo'],
                    precio_ahora: { $gte: min, $lte: max },
                    subcategoria: new RegExp(sub, 'i')
                }, ).populate('marca').populate('categoria').sort({ precio_ahora: -1 }).exec((err, producto_data) => {
                    if (err) {
                        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                    } else {
                        if (producto_data) {
                            res.status(200).send({ productos: producto_data });
                        } else {
                            res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                        }
                    }
                });
            } else if (orden == 'date') {
                Producto.find({
                    titulo: new RegExp(filtro, 'i'),
                    status: ['Activo'],
                    precio_ahora: { $gte: min, $lte: max },
                    subcategoria: new RegExp(sub, 'i')
                }, ).populate('marca').populate('categoria').sort({ createdAt: -1 }).exec((err, producto_data) => {
                    if (err) {
                        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                    } else {
                        if (producto_data) {
                            res.status(200).send({ productos: producto_data });
                        } else {
                            res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                        }
                    }
                });
            } else {
                Producto.find({
                    titulo: new RegExp(filtro, 'i'),
                    status: ['Activo'],
                    precio_ahora: { $gte: min, $lte: max },
                    subcategoria: new RegExp(sub, 'i')
                }, ).populate('marca').populate('categoria').sort({ createdAt: -1 }).exec((err, producto_data) => {
                    if (err) {
                        res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
                    } else {
                        if (producto_data) {
                            res.status(200).send({ productos: producto_data });
                        } else {
                            res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                        }
                    }
                });
            }
        }


    }


}



module.exports = {
    getProductos,
    crearProducto,
    getProducto,
    getProductoSlug,
    actualizarProducto,
    borrarProducto,
    find_by_slug,
    find_by_brandig,
    listar_newest,
    listar_best_sellers,
    listar_best_sellers_local,
    listar_populares,
    listar_populares_local,
    cat_by_name,
    listar_papelera,
    listar_cat,
    listar_cat_papelera,
    desactivar,
    activar,
    papelera,
    reducir_stock,
    aumentar_stock,
    aumentar_venta,
    listarAdmin,
    listar_autocomplete,
    listar_general_data,
    listar_productosCateg,
    list_one,
    destacado,
    getProductosActivos,
    ecoomerce,
    listar_productosColor,
    listar_productosCategNombre,
    getProductosTiendaId,
    getProductosTiendaIdActive,
    reducir_stock_internal,


};
