const { response } = require('express');
const Marca = require('../models/marca');
const Usuario = require('../models/usuario');
const Blog = require('../models/blog');
const Page = require('../models/page');
const Slider = require('../models/slider');
const Producto = require('../models/producto');
const Curso = require('../models/curso');
const Tienda = require('../models/tienda');
const Transferencia = require('../models/transferencia');
const PagoCheque = require('../models/pagocheque');
const PagoEfectivo = require('../models/pago.efectivo');
const Categoria = require('../models/categoria');
const Promocion = require('../models/promocion');

const getTodo = async(req, res = response) => {

    const busqueda = req.params.busqueda;
    const regex = new RegExp(busqueda, 'i');

    /*const usuarios = await Usuario.find({ nombre: regex });
    const medicos = await Medico.find({ nombre: regex });
    const hospitales = await Hospital.find({ nombre: regex });*/

    const [usuarios, marcas, blogs, pages, productos, 
        sliders, cursos, tiendas,  
        transferencias, pagoecheques, pagoefectivos, categorias,
        promocions,
        ] = await Promise.all([
        Usuario.find({ first_name: regex }),
        Marca.find({ nombre: regex }),
        Blog.find({ titulo: regex }),
        Page.find({ titulo: regex }),
        Producto.find({ $or: [{titulo: regex}, {sku: regex}] }),
        Slider.find({ first_title: regex }),
        Curso.find({ nombre: regex }),
        Tienda.find({ nombre: regex }),
        Transferencia.find({ $or: [{referencia: regex}, {fecha: regex}, {amount: regex}, {bankName: regex}]}),
        PagoCheque.find({ $or: [{ncheck: regex}, {name_person: regex}, {amount: regex}] }),
        PagoEfectivo.find({ $or: [{name_person: regex}, {amount: regex}] }),
        Categoria.find({ nombre: regex }),
        Promocion.find({ producto_title: regex }),
    ]);

    res.json({
        ok: true,
        usuarios,
        marcas,
        blogs,
        pages,
        productos,
        sliders,
        cursos,
        tiendas,
        transferencias,
        pagoecheques,
        pagoefectivos,
        categorias,
        promocions,

    });
}

const getDocumentosColeccion = async(req, res = response) => {

    const tabla = req.params.tabla;
    const busqueda = req.params.busqueda;
    const regex = new RegExp(busqueda, 'i');

    let data = [];

    switch (tabla) {
        case 'marcas':
            data = await Marca.find({ nombre: regex })
            break;


        case 'usuarios':
            data = await Usuario.find({ first_name: regex, email: regex });
            break;

        case 'blogs':
            data = await Blog.find({ titulo: regex });
            break;

        case 'pages':
            data = await Page.find({ titulo: regex });
            break;

        case 'sliders':
            data = await Slider.find({ first_title: regex });
            break;

        case 'productos':
            data = await Producto.find({ $or: [{titulo: regex}, {sku: regex}] });
            break;

        case 'cursos':
            data = await Curso.find({ nombre: regex });
            break;

        case 'tiendas':
            data = await Tienda.find({ nombre: regex });
            break;

        case 'trasnferencias':
            data = await Transferencia.find({ $or: [{referencia: regex}, {fecha: regex}, {amount: regex}, {bankName: regex}]});
            break;

        case 'pagoecheques':
            data = await PagoCheque.find({ $or: [{ncheck: regex}, {name_person: regex}, {amount: regex}]});
            break;

        case 'pagoefectivos':
            data = await PagoEfectivo.find({ $or: [{name_person: regex}, {amount: regex}] });
            break;

        case 'categorias':
            data = await Categoria.find({ nombre: regex, subcategorias:regex });
            break;
            
        case 'promocions':
            data = await Promocion.find({ producto_title: regex });
            break;



        default:
            return res.status(400).json({
                ok: false,
                msg: 'la tabla debe ser usuarios'
            });
    }

    res.json({
        ok: true,
        resultados: data
    });
}

module.exports = {
    getTodo,
    getDocumentosColeccion
}