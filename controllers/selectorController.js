const { response } = require('express');
const Selector = require('../models/selector');
const translate = require('google-translate-api-x');

const getSelectors = async(req, res) => {

    const selectors = await Selector.find().populate('titulo estado producto');

    res.json({
        ok: true,
        selectors
    });
};

const getSelector = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Selector.findById(id)
        .populate('producto')
        .exec((err, selector) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar Selector',
                    errors: err
                });
            }
            if (!selector) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El Selector con el id ' + id + 'no existe',
                    errors: { message: 'No existe un Selector con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                selector: selector
            });
        });


};

const crearSelector = async (req, res) => {
    try {
        let data = req.body;

        // Validamos que venga el título en el request
        if (!data.titulo) {
            return res.status(400).send({ 
                error: 'El campo título es requerido para crear el selector.' 
            });
        }

        // 🚀 LA MAGIA: Traducimos automáticamente el título al inglés antes de instanciar
        let traduccionTitulo = '';
        const tituloLimpio = data.titulo.trim();
        
        if (tituloLimpio.length > 0) {
            try {
                const resTraduccion = await translate(tituloLimpio, { from: 'es', to: 'en' });
                traduccionTitulo = (resTraduccion && resTraduccion.text) ? resTraduccion.text : '';
            } catch (errTranslate) {
                console.error(`⚠️ Falló la traducción del selector para "${tituloLimpio}":`, errTranslate.message);
                // Opcional: Puedes dejarlo en blanco o clonar el español en caso de falla extrema
                traduccionTitulo = ''; 
            }
        }

        const selector = new Selector();
        
        // Mapeamos el string plano a la estructura bilingüe { es, en } real
        selector.titulo = {
            es: tituloLimpio,
            en: traduccionTitulo // ✅ Guardado automático (Ej: "Salsas" -> "Sauces")
        };
        
        selector.producto = data.producto;
        selector.estado = data.estado || "activo"; 

        // Guardado moderno usando promesas / async-await
        const selector_data = await selector.save();

        res.status(200).send({ selector: selector_data });

    } catch (err) {
        console.error('Error al crear el selector:', err);
        res.status(500).send({ error: err.message || err });
    }
};


const actualizarSelector = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const selector = await Selector.findById(id);
        if (!selector) {
            return res.status(500).json({
                ok: false,
                msg: 'selector no encontrado por el id'
            });
        }

        const cambiosSelector = {
            ...req.body,
            usuario: uid
        }

        const selectorActualizado = await Selector.findByIdAndUpdate(id, cambiosSelector, { new: true });

        res.json({
            ok: true,
            selectorActualizado
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};

const borrarSelector = async(req, res) => {

    const id = req.params.id;

    try {

        const selector = await Selector.findById(id);
        if (!selector) {
            return res.status(500).json({
                ok: false,
                msg: 'Selector no encontrado por el id'
            });
        }

        await Selector.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'Selector eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};


const findByProduct = (req, res) => {
    var id = req.params['id'];

    // console.log(id);
    if (id == 'null') {
        Selector.find().exec((err, selector_data) => {
            if (err) {
                res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
            } else {
                if (selector_data) {
                    res.status(200).send({ selector: selector_data });
                } else {
                    res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                }
            }
        });
    } else {
        Selector.find({ producto: id }).exec((err, selector_data) => {
            if (err) {
                res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
            } else {
                if (selector_data) {
                    res.status(200).send({ selector: selector_data });
                } else {
                    res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                }
            }
        });
    }

};



module.exports = {
    getSelectors,
    crearSelector,
    actualizarSelector,
    borrarSelector,
    getSelector,
    findByProduct
};