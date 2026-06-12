const express = require('express');
const router = express.Router();
const translate = require('google-translate-api-x');

// Importas tus dos modelos de Mongoose
const Producto = require('../models/producto');
const Categoria = require('../models/categoria');
const Selector = require('../models/selector');

// 🚀 ENDPOINT DE MIGRACIÓN ÚNICA
// Ejecutar una sola vez en producción para internacionalizar la data existente
router.post('/migrar-base-datos-i18n', async (req, res) => {
    try {
        console.log('=== Iniciando proceso de migración internacional de datos ===');

        let productosMigrados = 0;
        let categoriasMigradas = 0;
        let selectoresMigrados = 0; // Incrementar contador

        // 🔎 DIAGNÓSTICO DE EMERGENCIA: Vamos a espiar el primer registro real
        const pruebaCat = await Categoria.findOne({});
        const pruebaProd = await Producto.findOne({});
        const pruebaSelector = await Selector.findOne({}); // Añadido al diagnóstico

        console.log("====== ESTRUCTURA REAL EN TU MONGODB ======");
        console.log("Estructura de una Categoría:", JSON.stringify(pruebaCat, null, 2));
        console.log("Estructura de un Producto:", JSON.stringify(pruebaProd, null, 2));
        console.log("Estructura de un Selector:", JSON.stringify(pruebaSelector, null, 2));
        console.log("===========================================");

                // ==========================================
        // 1. 📂 MIGRACIÓN DE CATEGORÍAS (Cambio a subcategoria singular + i18n)
        // ==========================================
        // Buscamos categorías usando el campo viejo "nombre" o verificando que no se haya migrado aún
        const categoriasAntiguas = await Categoria.find({ "nombre.es": { $exists: false } }).lean();
        console.log(`Se encontraron ${categoriasAntiguas.length} categorías antiguas para migrar.`);

        for (let categoria of categoriasAntiguas) {
            try {
                // 1. Capturamos los campos planos antiguos
                const nombreBase = (categoria.nombre && typeof categoria.nombre === 'string') ? categoria.nombre.trim() : '';
                // Capturamos el campo viejo en plural 'subcategorias'
                const subcatBase = (categoria.subcategorias && typeof categoria.subcategorias === 'string') ? categoria.subcategorias.trim() : '';

                if (!nombreBase) {
                    console.log(`⚠️ Saltando categoría ID ${categoria._id} porque el nombre está vacío.`);
                    continue;
                }

                console.log(`Traduciendo Categoría: "${nombreBase}" y Subcategoría: "${subcatBase}"...`);
                
                // 2. Traducimos el Nombre de la Categoría
                const resTranslation = await translate(nombreBase, { from: 'es', to: 'en' });
                const nombreEn = (resTranslation && resTranslation.text) ? resTranslation.text : "";

                // 3. Traducimos la Subcategoría vieja
                let subcatEn = "";
                if (subcatBase) {
                    const resSubcat = await translate(subcatBase, { from: 'es', to: 'en' });
                    subcatEn = (resSubcat && resSubcat.text) ? resSubcat.text : "";
                }

                // 4. Actualizamos la BD: Guardamos lo nuevo bilingüe ($set) y borramos lo viejo en plural ($unset)
                await Categoria.updateOne(
                    { _id: categoria._id },
                    { 
                        $set: { 
                            nombre: { es: nombreBase, en: nombreEn },
                            subcategoria: { es: subcatBase, en: subcatEn } // Nuevo campo singular bilingüe
                        },
                        $unset: {
                            subcategorias: "" // 🔥 Eliminamos el campo viejo en plural de la base de datos
                        }
                    }
                );
                
                categoriasMigradas++;
                await new Promise(resolve => setTimeout(resolve, 350)); // Anti-ban
            } catch (error) {
                console.error(`❌ Error en categoría ${categoria._id}:`, error.message);

                if (error.message.includes('MongooseServerSelectionError') || error.name === 'MongooseServerSelectionError') {
                    console.error("🚨 Base de datos desconectada. Deteniendo migración para evitar corrupción.");
                    break;
                }

                try {
                    // Escudo: Si falla internet, guardamos lo que tenemos en español y limpiamos el plural
                    await Categoria.updateOne(
                        { _id: categoria._id },
                        { 
                            $set: { 
                                nombre: { es: categoria.nombre || "", en: "" },
                                subcategoria: { es: categoria.subcategorias || "", en: "" }
                            },
                            $unset: { subcategorias: "" }
                        }
                    );
                    categoriasMigradas++;
                } catch (dbErr) {
                    console.error("No se pudo guardar en BD por desconexión.");
                    break;
                }
            }
        }
        console.log("=== Migración de categorías finalizada ===");


        // ==========================================
        // 2. 🍔 MIGRACIÓN DE PRODUCTOS (PLATOS)
        // ==========================================
        const productosAntiguos = await Producto.find({ "titulo.es": { $exists: false } }).lean();
        console.log(`Se encontraron ${productosAntiguos.length} productos antiguos para migrar.`);

        for (let producto of productosAntiguos) {
            try {
                const tituloBase = (producto.titulo && typeof producto.titulo === 'string') ? producto.titulo.trim() : '';
                const infoBase = (producto.info_short && typeof producto.info_short === 'string') ? producto.info_short.trim() : '';

                if (!tituloBase) {
                    console.log(`⚠️ Saltando producto ID ${producto._id} porque no tiene título.`);
                    continue;
                }

                console.log(`Traduciendo Producto: "${tituloBase}"...`);

                let tituloEn = '';
                if (tituloBase) {
                    const resTitulo = await translate(tituloBase, { from: 'es', to: 'en' });
                    tituloEn = (resTitulo && resTitulo.text) ? resTitulo.text : '';
                }

                let infoEn = '';
                if (infoBase) {
                    const resInfo = await translate(infoBase, { from: 'es', to: 'en' });
                    infoEn = (resInfo && resInfo.text) ? resInfo.text : '';
                }

                await Producto.updateOne(
                    { _id: producto._id },
                    {
                        $set: {
                            titulo: { es: tituloBase, en: tituloEn },
                            info_short: { es: infoBase, en: infoEn },
                            detalle: { es: infoBase, en: infoEn }
                        }
                    }
                );

                productosMigrados++;
                await new Promise(resolve => setTimeout(resolve, 350)); // Anti-ban
            } catch (errorProducto) {
                console.error(`❌ Falló producto ID ${producto._id}:`, errorProducto.message);

                if (errorProducto.message.includes('MongooseServerSelectionError') || errorProducto.name === 'MongooseServerSelectionError') {
                    console.error("🚨 Base de datos desconectada. Deteniendo migración para evitar corrupción.");
                    break;
                }

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
                    productosMigrados++;
                } catch (dbErr) {
                    console.error("No se pudo guardar en BD por desconexión.");
                    break;
                }
            }
        }
        console.log("=== Migración de productos finalizada ===");

        // ==========================================
        // 3. 🔘 MIGRACIÓN DE SELECTORES (NUEVO)
        // ==========================================
        const selectoresAntiguos = await Selector.find({ "titulo.es": { $exists: false } }).lean();
        console.log(`Se encontraron ${selectoresAntiguos.length} selectores antiguos para migrar.`);

        for (let selector of selectoresAntiguos) {
            try {
                const tituloBase = (selector.titulo && typeof selector.titulo === 'string') ? selector.titulo.trim() : '';

                if (!tituloBase) {
                    console.log(`⚠️ Saltando selector ID ${selector._id} porque no tiene título.`);
                    continue;
                }

                console.log(`Traduciendo Selector: "${tituloBase}"...`);
                const resSelector = await translate(tituloBase, { from: 'es', to: 'en' });
                const tituloEn = (resSelector && resSelector.text) ? resSelector.text : '';

                await Selector.updateOne(
                    { _id: selector._id },
                    { $set: { titulo: { es: tituloBase, en: tituloEn } } }
                );

                selectoresMigrados++;
                await new Promise(resolve => setTimeout(resolve, 350)); // Anti-ban
            } catch (errorSelector) {
                console.error(`❌ Falló selector ID ${selector._id}:`, errorSelector.message);

                if (errorSelector.message.includes('MongooseServerSelectionError') || errorSelector.name === 'MongooseServerSelectionError') {
                    console.error("🚨 Base de datos desconectada. Deteniendo migración para evitar corrupción.");
                    break;
                }

                try {
                    await Selector.updateOne(
                        { _id: selector._id },
                        { $set: { titulo: { es: selector.titulo || '', en: '' } } }
                    );
                    selectoresMigrados++;
                } catch (dbErr) {
                    console.error("No se pudo guardar en BD por desconexión.");
                    break;
                }
            }
        }
        console.log("=== Migración de selectores finalizada ===");

        // ==========================================
        // RESPUESTA EXITOSA DE LA MIGRACIÓN TOTAL
        // ==========================================
        res.json({
            ok: true,
            msg: 'La base de datos de Zlipmenu ha sido internacionalizada con éxito.',
            reporte: {
                categorias_actualizadas: categoriasMigradas,
                productos_actualizados: productosMigrados,
                selectores_actualizados: selectoresMigrados // Incluido en respuesta
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
