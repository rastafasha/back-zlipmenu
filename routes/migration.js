const express = require('express');
const router = express.Router();
const translate = require('google-translate-api-x');

// Importas tus dos modelos de Mongoose
const Producto = require('../models/producto');
const Categoria = require('../models/categoria');

// 🚀 ENDPOINT DE MIGRACIÓN ÚNICA
// Ejecutar una sola vez en producción para internacionalizar la data existente
router.post('/migrar-base-datos-i18n', async (req, res) => {
    try {
        console.log('=== Iniciando proceso de migración internacional de datos ===');

        let productosMigrados = 0;
        let categoriasMigradas = 0;

        // 🔎 DIAGNÓSTICO DE EMERGENCIA: Vamos a espiar el primer registro real
        const pruebaCat = await Categoria.findOne({});
        const pruebaProd = await Producto.findOne({});

        console.log("====== ESTRUCTURA REAL EN TU MONGODB ======");
        console.log("Estructura de una Categoría:", JSON.stringify(pruebaCat, null, 2));
        console.log("Estructura de un Producto:", JSON.stringify(pruebaProd, null, 2));
        console.log("===========================================");

        // 1. 📂 MIGRACIÓN DE CATEGORÍAS
        // Buscamos las categorías que tengan el campo 'nombre' como un String plano viejo
        // (En Mongoose, si ya tiene estructura de objeto, comprobar el tipo ayuda a filtrar)
        const categoriasAntiguas = await Categoria.find({ "nombre.es": { $exists: false } }).lean();
        console.log(`Se encontraron ${categoriasAntiguas.length} categorías antiguas para migrar.`);

        for (let categoria of categoriasAntiguas) {
            try {
                const nombreBase = (categoria.nombre && typeof categoria.nombre === 'string') ? categoria.nombre.trim() : '';

                if (!nombreBase) {
                    console.log(`⚠️ Saltando categoría ID ${categoria._id} porque está vacía.`);
                    continue;
                }

                console.log(`Tradiciendo Categoría: "${nombreBase}"...`);
                const res = await translate(nombreBase, { from: 'es', to: 'en' });
                const nombreEn = (res && res.text) ? res.text : "";

                // Guardamos la estructura bilingüe definitiva
                await Categoria.updateOne(
                    { _id: categoria._id },
                    { $set: { nombre: { es: nombreBase, en: nombreEn } } }
                );

                await new Promise(resolve => setTimeout(resolve, 350)); // Anti-ban
            } catch (error) {
                console.error(`❌ Error en categoría ${categoria._id}:`, error.message);

                // ESCUDO: Si el error es por desconexión de MongoDB, rompemos el bucle para no reventar el proceso
                if (error.message.includes('MongooseServerSelectionError') || error.name === 'MongooseServerSelectionError') {
                    console.error("🚨 Base de datos desconectada. Deteniendo migración para evitar corrupción.");
                    break;
                }

                // Si solo falló el internet en Google Translate, salvamos el registro en español
                try {
                    await Categoria.updateOne(
                        { _id: categoria._id },
                        { $set: { nombre: { es: categoria.nombre || "", en: "" } } }
                    );
                } catch (dbErr) {
                    console.error("No se pudo guardar en BD por desconexión.");
                    break;
                }
            }
        }

        console.log("=== Migración de categorías finalizada ===");

        // 2. 🍔 MIGRACIÓN DE PRODUCTOS (PLATOS)
        // Buscamos los productos que aún tengan el 'titulo' como string plano viejo
        const productosAntiguos = await Producto.find({ "titulo.es": { $exists: false } }).lean();
        console.log(`Se encontraron ${productosAntiguos.length} productos antiguos para migrar.`);

        for (let producto of productosAntiguos) {
            try {
                // Mapeamos los campos reales de tu BD: "titulo" e "info_short"
                const tituloBase = (producto.titulo && typeof producto.titulo === 'string') ? producto.titulo.trim() : '';
                const infoBase = (producto.info_short && typeof producto.info_short === 'string') ? producto.info_short.trim() : '';

                if (!tituloBase) {
                    console.log(`⚠️ Saltando producto ID ${producto._id} porque no tiene título.`);
                    continue;
                }

                console.log(`Tradiciendo Producto: "${tituloBase}"...`);

                // Traducimos el Título
                let tituloEn = '';
                if (tituloBase) {
                    const resTitulo = await translate(tituloBase, { from: 'es', to: 'en' });
                    tituloEn = (resTitulo && resTitulo.text) ? resTitulo.text : '';
                }

                // Traducimos la Descripción Corta
                let infoEn = '';
                if (infoBase) {
                    const resInfo = await translate(infoBase, { from: 'es', to: 'en' });
                    infoEn = (resInfo && resInfo.text) ? resInfo.text : '';
                }

                // Actualizamos la base de datos aplicando la estructura bilingüe {es, en}
                await Producto.updateOne(
                    { _id: producto._id },
                    {
                        $set: {
                            titulo: { es: tituloBase, en: tituloEn },
                            info_short: { es: infoBase, en: infoEn },
                            detalle: { es: infoBase, en: infoEn } // Actualiza detalle también si lo requieres
                        }
                    }
                );

                await new Promise(resolve => setTimeout(resolve, 350)); // Anti-ban
            } catch (errorProducto) {
                console.error(`❌ Falló producto ID ${producto._id}:`, errorProducto.message);

                // ESCUDO: Si el error es por desconexión de MongoDB, rompemos el bucle para no reventar el proceso
                if (error.message.includes('MongooseServerSelectionError') || error.name === 'MongooseServerSelectionError') {
                    console.error("🚨 Base de datos desconectada. Deteniendo migración para evitar corrupción.");
                    break;
                }

                // Si solo falló el internet en Google Translate, salvamos el registro en español
                try {
                    await Producto.updateOne(
                        { _id: producto._id },
                        {
                            $set: {
                                titulo: { es: producto.titulo || '', en: '' },
                                info_short: { es: producto.info_short || '', en: '' },
                                detalle: { es: producto.detalle || '', en: '' }
                            }
                        }
                    );
                } catch (dbErr) {
                    console.error("No se pudo guardar en BD por desconexión.");
                    break;
                }
            }
        }

        console.log("=== ¡Proceso de migración de productos FINALIZADO con éxito! ===");

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
