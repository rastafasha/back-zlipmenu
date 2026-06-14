const express = require('express');
const router = express.Router();
const translate = require('google-translate-api-x');

// Importas tus dos modelos de Mongoose
const Producto = require('../models/producto');
const Categoria = require('../models/categoria');
const Selector = require('../models/selector');
const Tienda = require('../models/tienda');

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

        // ==========================================
        // 1. 📂 MIGRACIÓN DE CATEGORÍAS (Cambio a subcategoria singular + i18n)
        // ==========================================
        // 🟢 CAMBIAMOS EL NOMBRE DE LA VARIABLE PARA EVITAR EL DUPLICADO ("listaCategoriasViejas")
        const listaCategoriasViejas = await Categoria.find({ "nombre.es": { $exists: false } }).lean();
        console.log(`Se encontraron ${listaCategoriasViejas.length} categorías antiguas para migrar.`);

        for (let categoria of listaCategoriasViejas) { // 🟢 Actualizado aquí también
            try {
                // 1. Capturamos los campos planos antiguos
                const nombreBase = (categoria.nombre && typeof categoria.nombre === 'string') ? categoria.nombre.trim() : '';
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

                // 4. Actualizamos la BD: Guardamos en SINGULAR (subcategoria) y eliminamos el PLURAL viejo (subcategorias)
                await Categoria.updateOne(
                    { _id: categoria._id },
                    {
                        $set: {
                            nombre: { es: nombreBase, en: nombreEn },
                            subcategoria: { es: subcatBase, en: subcatEn }
                        },
                        $unset: {
                            subcategorias: ""
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
                    const nombreFailsafe = (categoria.nombre && typeof categoria.nombre === 'string') ? categoria.nombre : "";
                    const subcatFailsafe = (categoria.subcategorias && typeof categoria.subcategorias === 'string') ? categoria.subcategorias : "";

                    await Categoria.updateOne(
                        { _id: categoria._id },
                        {
                            $set: {
                                nombre: { es: nombreFailsafe, en: "" },
                                subcategoria: { es: subcatFailsafe, en: "" }
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
        // 4. 🏪 MIGRACIÓN DE TEXTOS HERO DE TIENDAS (NUEVO)
        // ==========================================
        // Buscamos las tiendas que aún tengan el primer campo del hero como string plano viejo
        const tiendasAntiguas = await Tienda.find({ "texto_hero_uno.es": { $exists: false } }).lean();
        console.log(`Se encontraron ${tiendasAntiguas.length} tiendas antiguas para migrar textos del Hero.`);

        let tiendasMigradas = 0;

        for (let tienda of tiendasAntiguas) {
            try {
                // 1. Capturamos y limpiamos los textos planos viejos
                const heroUnoBase = (tienda.texto_hero_uno && typeof tienda.texto_hero_uno === 'string') ? tienda.texto_hero_uno.trim() : '';
                const heroDosBase = (tienda.texto_hero_dos && typeof tienda.texto_hero_dos === 'string') ? tienda.texto_hero_dos.trim() : '';
                const heroDestacadoBase = (tienda.texto_hero_destacado && typeof tienda.texto_hero_destacado === 'string') ? tienda.texto_hero_destacado.trim() : '';
                const descHeroBase = (tienda.descripcion_hero && typeof tienda.descripcion_hero === 'string') ? tienda.descripcion_hero.trim() : '';

                console.log(`Traduciendo Hero de la tienda: "${tienda.nombre || tienda._id}"...`);

                // 2. Traducimos cada uno de los campos en caliente
                let heroUnoEn = '';
                if (heroUnoBase) {
                    const res1 = await translate(heroUnoBase, { from: 'es', to: 'en' });
                    heroUnoEn = (res1 && res1.text) ? res1.text : '';
                }

                let heroDosEn = '';
                if (heroDosBase) {
                    const res2 = await translate(heroDosBase, { from: 'es', to: 'en' });
                    heroDosEn = (res2 && res2.text) ? res2.text : '';
                }

                let heroDestacadoEn = '';
                if (heroDestacadoBase) {
                    const res3 = await translate(heroDestacadoBase, { from: 'es', to: 'en' });
                    heroDestacadoEn = (res3 && res3.text) ? res3.text : '';
                }

                let descHeroEn = '';
                if (descHeroBase) {
                    const res4 = await translate(descHeroBase, { from: 'es', to: 'en' });
                    descHeroEn = (res4 && res4.text) ? res4.text : '';
                }

                // 3. Impactamos los cambios estructurados en la Base de Datos
                await Tienda.updateOne(
                    { _id: tienda._id },
                    {
                        $set: {
                            texto_hero_uno: { es: heroUnoBase, en: heroUnoEn },
                            texto_hero_dos: { es: heroDosBase, en: heroDosEn },
                            texto_hero_destacado: { es: heroDestacadoBase, en: heroDestacadoEn },
                            descripcion_hero: { es: descHeroBase, en: descHeroEn }
                        }
                    }
                );

                tiendasMigradas++;
                await new Promise(resolve => setTimeout(resolve, 350)); // Anti-ban de Google
            } catch (errorTienda) {
                console.error(`❌ Falló tienda ID ${tienda._id}:`, errorTienda.message);

                if (errorTienda.message.includes('MongooseServerSelectionError') || errorTienda.name === 'MongooseServerSelectionError') {
                    console.error("🚨 Base de datos desconectada. Deteniendo migración de tiendas.");
                    break;
                }

                // Escudo protector: Si falla internet, guardamos lo que tenemos en español
                try {
                    await Tienda.updateOne(
                        { _id: tienda._id },
                        {
                            $set: {
                                texto_hero_uno: { es: tienda.texto_hero_uno || '', en: '' },
                                texto_hero_dos: { es: tienda.texto_hero_dos || '', en: '' },
                                texto_hero_destacado: { es: tienda.texto_hero_destacado || '', en: '' },
                                descripcion_hero: { es: tienda.descripcion_hero || '', en: '' }
                            }
                        }
                    );
                    tiendasMigradas++;
                } catch (dbErr) {
                    console.error("No se pudo guardar la tienda de respaldo por desconexión de BD.");
                    break;
                }
            }
        }
        console.log("=== Migración de textos Hero de tiendas finalizada ===");

        // ==========================================
        // RESPUESTA EXITOSA DE LA MIGRACIÓN TOTAL
        // ==========================================
        res.json({
            ok: true,
            msg: 'La base de datos de Zlipmenu ha sido internacionalizada con éxito.',
            reporte: {
                categorias_actualizadas: categoriasMigradas,
                productos_actualizados: productosMigrados,
                selectores_actualizados: selectoresMigrados, // Incluido en respuesta
                tiendas_migradas: tiendasMigradas,
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
