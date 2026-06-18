const { response } = require('express');
const Tienda = require('../models/tienda');
const Producto = require('../models/producto');
const User = require('../models/usuario');
const Categoria = require('../models/categoria');
const translate = require('google-translate-api-x');

const getTiendas = async (req, res) => {


    const tiendas = await Tienda.find()
        .sort({ createdAt: -1 })
        .populate('categoria', 'nombre');

    res.json({
        ok: true,
        tiendas,
        categoria: Categoria
    });
};

const getTienda = async (req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Tienda.findById(id)
        .exec((err, tienda) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar tienda',
                    errors: err
                });
            }
            if (!tienda) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El tienda con el id ' + id + 'no existe',
                    errors: { message: 'No existe un tienda con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                tienda: tienda,
                users: User,
                productos: Producto,
            });
        });

};
const crearTienda = async (req, res) => {
    try {
        const uid = req.uid;
        let data = req.body;

        // [Tu lógica nativa exacta del slug se mantiene aquí...]
        const nombre = data.nombre || '';
        const slug = nombre.toLowerCase().trim().replace(/[\s]+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n').replace(/ü/g, 'u');

        // 🔥 FUNCIÓN TRADUCTORA AUTOMÁTICA EN TIEMPO REAL
        const traducirCampoI18n = async (campoNuevo) => {
            let esText = '';
            let enText = '';

            if (campoNuevo && typeof campoNuevo === 'object') {
                esText = (campoNuevo.es || '').trim();
                enText = (campoNuevo.en || '').trim();
            } else if (campoNuevo && typeof campoNuevo === 'string') {
                esText = campoNuevo.trim();
            }

            if (esText && !enText) {
                try {
                    const resTraduccion = await translate(esText, { from: 'es', to: 'en' });
                    enText = (resTraduccion && resTraduccion.text) ? resTraduccion.text : '';
                } catch (errTranslate) {
                    console.error(`⚠️ Falló Google Translate para "${esText}":`, errTranslate.message);
                }
            }

            return { es: esText, en: enText };
        };

        // 🚀 AUTOMATIZACIÓN MULTI-TIENDA:
        // Si en el body envías el ID del admin (data.usuario o data.user), la tienda se le asigna a él.
        // Si no viene nada (porque el admin se está registrando solo), se asigna a su propio uid.
        const duenoFinal = data.usuario || data.user || uid;

        // 🚨 PROTECCIÓN: Sacamos 'usuario' y 'user' de data para evitar que el operador spread (...data) los pise
        const { usuario, user, ...restoData } = data;

        const tienda = new Tienda({
            ...restoData,
            user: duenoFinal, // ✅ CORREGIDO: Mapeamos a la propiedad 'user' exacta de tu TiendaSchema
            slug: slug,
            // 🚀 Traducimos de forma asíncrona cada sección del Hero
            texto_hero_uno: await traducirCampoI18n(restoData.texto_hero_uno),
            texto_hero_dos: await traducirCampoI18n(restoData.texto_hero_dos),
            texto_hero_destacado: await traducirCampoI18n(restoData.texto_hero_destacado),
            descripcion_hero: await traducirCampoI18n(restoData.descripcion_hero)
        });

        const tiendaDB = await tienda.save();
        res.json({ ok: true, tienda: tiendaDB });

    } catch (error) {
        console.error('Error crítico al crear tienda:', error);
        res.status(500).json({ ok: false, msg: 'Error interno en el servidor.', error: error.message });
    }
};

const actualizarTienda = async (req, res) => {
    const id = req.params.id;
    const uid = req.uid; // ID de quien ejecuta la acción (tú como superadmin)
    let data = req.body;

    // ✅ CONSOLE.LOG PERFECTAMENTE SITUADO
    console.log('--- DEBUG UPDATE TIENDA ---');
    console.log('ID del que ejecuta (uid):', req.uid);
    console.log('Viene en el body (req.body.user):', req.body.user);

    try {
        const tienda = await Tienda.findById(id);
        if (!tienda) {
            return res.status(404).json({ ok: false, msg: 'Tienda no encontrada por el id' });
        }

        // 🚨 PROTECCIÓN MULTI-TIENDA: Aislamos tanto 'usuario' como 'user' del body para ignorarlos por completo
        const { usuario, user, ...limpioData } = data;

        // 🔥 FUSIÓN + TRADUCCIÓN INTELIGENTE AL ACTUALIZAR
        const fusionarYTraducirI18n = async (campoNuevo, campoBaseDatos) => {
            let esText = '';
            let enText = '';

            if (campoNuevo && typeof campoNuevo === 'object') {
                esText = campoNuevo.es !== undefined ? campoNuevo.es.trim() : (campoBaseDatos?.es || '');
                enText = campoNuevo.en !== undefined ? campoNuevo.en.trim() : (campoBaseDatos?.en || '');
            } else if (campoNuevo && typeof campoNuevo === 'string') {
                esText = campoNuevo.trim();
                enText = campoBaseDatos?.en || '';
            } else {
                return campoBaseDatos || { es: '', en: '' };
            }

            const esDiferente = campoBaseDatos?.es !== esText;

            if (esText && (esDiferente || !enText)) {
                try {
                    console.log(`🌐 Re-traduciendo cambio en Hero: "${esText}"`);
                    const resTraduccion = await translate(esText, { from: 'es', to: 'en' });
                    enText = (resTraduccion && resTraduccion.text) ? resTraduccion.text : '';
                } catch (errTranslate) {
                    console.error('⚠️ Error al re-traducir campo:', errTranslate.message);
                }
            }

            return { es: esText, en: enText };
        };

        // ✅ CORRECCIÓN: Construimos cambiosTienda usando 'limpioData' en lugar de 'data'
        const cambiosTienda = {
            ...limpioData,
            
            // 🔒 BLINDAJE ABSOLUTO: Forzamos el dueño original ('user') de la base de datos
            // Esto evita que un hacker o un error del frente cambie el dueño de la tienda
            user: tienda.user, 

            texto_hero_uno: await fusionarYTraducirI18n(limpioData.texto_hero_uno, tienda.texto_hero_uno),
            texto_hero_dos: await fusionarYTraducirI18n(limpioData.texto_hero_dos, tienda.texto_hero_dos),
            texto_hero_destacado: await fusionarYTraducirI18n(limpioData.texto_hero_destacado, tienda.texto_hero_destacado),
            descripcion_hero: await fusionarYTraducirI18n(limpioData.descripcion_hero, tienda.descripcion_hero)
        };

        if (limpioData.nombre) {
            const nombre = limpioData.nombre;
            const slug = nombre.toLowerCase().trim().replace(/[\s]+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n').replace(/ü/g, 'u');
            cambiosTienda.slug = slug;
        }

        const tiendaActualizado = await Tienda.findByIdAndUpdate(id, cambiosTienda, { new: true });
        res.json({ ok: true, tiendaActualizado });

    } catch (error) {
        console.error('Error al actualizar la tienda:', error);
        res.status(500).json({ ok: false, msg: 'Error interno en el servidor.', error: error.message });
    }
};




const borrarTienda = async (req, res) => {

    const id = req.params.id;

    try {

        const tienda = await Tienda.findById(id);
        if (!tienda) {
            return res.status(500).json({
                ok: false,
                msg: 'Tienda no encontrado por el id'
            });
        }

        await Tienda.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'Tienda eliminado'
        });

    } catch (error) {
        // console.log(error)
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};


async function find_by_name(req, res) {
    var nombre = req.params['nombre'];

    try {

        // Use case-insensitive regex for the search
        const tienda = await Tienda.findOne({
            nombre: { $regex: nombre, $options: 'i' }
        }).populate('categoria');

        if (!tienda) {
            return res.status(404).json({
                ok: false,
                msg: 'No se encontró ninguna tienda con el nombre: ' + nombre
            });
        }

        res.json({
            ok: true,
            tienda: tienda
        });

    } catch (error) {
        console.error('Error en find_by_name:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin',
            error: error.message
        });
    }
}

function find_by_slug(req, res) {
    var slug = req.params['slug'];

    Tienda.findOne({ slug: slug })
        .exec((err, tienda_data) => {
            if (err) {
                res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
            } else {
                if (tienda_data) {
                    res.status(200).send({ tienda: tienda_data });
                } else {
                    res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                }
            }
        });
}

function find_by_userid(req, res) {
    const userid = req.params.userid;

    Tienda.find({ user: userid })
        .populate('user')
        .populate('categoria')
        .exec((err, tienda_data) => {
            if (err) {
                res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
            } else {
                if (tienda_data) {
                    res.status(200).send({ tiendas: tienda_data });
                } else {
                    res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                }
            }
        });
}

const getTiendasActivos = async (req, res) => {

    Tienda.find({ status: ['Activo'] }).exec((err, tienda_data) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (tienda_data) {
                res.status(200).send({ tiendas: tienda_data });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });

};

function desactivar(req, res) {
    var id = req.params['id'];

    Tienda.findByIdAndUpdate({ _id: id }, { status: 'Desactivado' }, (err, tienda_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (tienda_data) {
                res.status(200).send({ tienda: tienda_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el tienda, vuelva a intentar nuevamente.' });
            }
        }
    })
}

function activar(req, res) {
    var id = req.params['id'];
    // console.log(id);
    Tienda.findByIdAndUpdate({ _id: id }, { status: 'Activo' }, (err, tienda_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (tienda_data) {
                res.status(200).send({ tienda: tienda_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el tienda, vuelva a intentar nuevamente.' });
            }
        }
    })
}


module.exports = {
    getTiendas,
    crearTienda,
    actualizarTienda,
    borrarTienda,
    getTienda,
    find_by_name,
    getTiendasActivos,
    desactivar,
    activar,
    find_by_slug,
    find_by_userid
};