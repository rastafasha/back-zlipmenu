const express = require('express');
const router = express.Router();
const translate = require('google-translate-api-x');

// Importas tus dos modelos de Mongoose
const Producto = require('../models/producto');
const Categoria = require('../models/categoria');

// 🚀 ENDPOINT DE MIGRACIÓN ÚNICA
// Ejecutar una sola vez en producción para internacionalizar la data existente
router.post('/api/admin/migrar-base-datos-i18n', async (req, res) => {
    try {
        console.log('=== Iniciando proceso de migración internacional de datos ===');
        
        let productosMigrados = 0;
        let categoriasMigradas = 0;

        // 1. 📂 MIGRACIÓN DE CATEGORÍAS
        // Buscamos las categorías que tengan el campo 'nombre' como un String plano viejo
        // (En Mongoose, si ya tiene estructura de objeto, comprobar el tipo ayuda a filtrar)
        const categoriasViejas = await Categoria.find({ "nombre.es": { $exists: false } });
        console.log(`Se encontraron ${categoriasViejas.length} categorías antiguas para migrar.`);

        for (let cat of categoriasViejas) {
            // El valor actual es un string plano (ej: "Entradas")
            const nombreViejo = cat.nombre; 

            // Traducimos al inglés en un milisegundo
            const traduccion = await translate(nombreViejo, { from: 'es', to: 'en' });

            await Categoria.findByIdAndUpdate(cat._id, {
                $set: {
                    nombre: {
                        es: nombreViejo,
                        en: traduccion.text
                    }
                }
            });
            categoriasMigradas++;
        }

        // 2. 🍔 MIGRACIÓN DE PRODUCTOS (PLATOS)
        // Buscamos los productos que aún tengan el 'titulo' como string plano viejo
        const productosViejos = await Producto.find({ "titulo.es": { $exists: false } });
        console.log(`Se encontraron ${productosViejos.length} productos antiguos para migrar.`);

        for (let prod of productosViejos) {
            const tituloViejo = prod.titulo || '';
            const infoShortVieja = prod.info_short || '';
            const detalleViejo = prod.detalle || '';

            // Traducimos en paralelo los tres campos de este plato para máxima velocidad
            const [traducirTitulo, traducirShort, traducirDetalle] = await Promise.all([
                translate(tituloViejo, { from: 'es', to: 'en' }),
                translate(infoShortVieja, { from: 'es', to: 'en' }),
                translate(detalleViejo, { from: 'es', to: 'en' })
            ]);

            await Producto.findByIdAndUpdate(prod._id, {
                $set: {
                    titulo: {
                        es: tituloViejo,
                        en: traducirTitulo.text
                    },
                    info_short: {
                        es: infoShortVieja,
                        en: traducirShort.text
                    },
                    detalle: {
                        es: detalleViejo,
                        en: traducirDetalle.text
                    }
                }
            });
            productosMigrados++;
        }

        console.log('=== ¡Migración completada con éxito absoluto! ===');
        
        res.json({
            ok: true,
            msg: 'La base de datos de Zlipmenu ha sido internacionalizada con éxito.',
            reporte: {
                categorias_actualizadas: categoriasMigradas,
                productos_actualizados: productosMigrados
            }
        });

    } catch (error) {
        console.error('Error crítico durante la migración de datos:', error);
        res.status(500).json({
            ok: false,
            msg: 'La migración falló en mitad del proceso.',
            error: error.message
        });
    }
});

module.exports = router;
