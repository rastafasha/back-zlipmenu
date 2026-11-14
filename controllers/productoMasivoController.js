const { response } = require('express');
const Producto = require('../models/producto');
const Categoria = require('../models/categoria');
const Selector = require('../models/selector');
const Color = require('../models/color');
const translate = require('google-translate-api-x');
const XLSX = require('xlsx');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Sincronizamos las credenciales exactas que usa tu controlador de subidas
cloudinary.config({
    api_key: process.env.API_KEY_CLOUDINARY,
    api_secret: process.env.API_SECRET_CLOUDINARY,
    cloud_name: process.env.CLOUD_NAME
});


// ==========================================
// Cargar productos desde Excel y vincular imágenes
// ==========================================
const importarProductosExcel = async (req, res) => {
    try {
        if (!req.files || !req.files.excel) {
            return res.status(400).json({ ok: false, msg: 'No se subió ningún archivo de Excel o CSV.' });
        }

        const idLocal = req.body.local; // Aislamiento Multi-Tenant
        if (!idLocal) {
            return res.status(400).json({ ok: false, msg: 'El ID del local es obligatorio.' });
        }

        const archivo = req.files.excel;
        // 🚀 MEJORA DE LECTURA: Soportamos tanto archivos temporales en disco como buffers en memoria
        let bufferData;
        if (archivo.tempFilePath) {
            const fs = require('fs');
            bufferData = fs.readFileSync(archivo.tempFilePath);
        } else {
            bufferData = archivo.data;
        }

        const workbook = XLSX.read(bufferData, { type: 'buffer' });

        // 🔑 CORRECCIÓN CRÍTICA: Tomamos el nombre de la PRIMERA pestaña [0] de forma explícita
        const primeraPestanaNombre = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[primeraPestanaNombre];

        // Convertimos las filas a JSON
        const datos = XLSX.utils.sheet_to_json(worksheet);

        // 🔍 LOG EN CONSOLA PARA VERIFICAR SI YA HAY DATOS
        console.log('📌 Nombre de la pestaña leída:', primeraPestanaNombre);
        console.log('📊 Cantidad de filas JSON extraídas:', datos.length);
        if (datos.length > 0) {
            console.log('👀 Muestra de la primera fila:', datos[0]);
        }

        const productosCreados = [];
        const errores = [];

        for (const [index, fila] of datos.entries()) {
            const tituloEs = fila.titulo_es || '';
            const textoShort = fila.info_short_es || '';
            const textoDetalle = fila.detalle_es || '';
            const catNombre = fila.nombre_categoria || 'General';

            console.log(`➡️ Procesando fila #${index + 1}: ${tituloEs || 'SÍIN TÍTULO'}`);

            if (!tituloEs) {
                errores.push(`Fila ${index + 1} omitida: El campo 'titulo_es' es mandatorio.`);
                continue;
            }

            // 1. Lógica de generación de SLUG seguro heredada de tu SaaS
            const slug = tituloEs
                .toLowerCase()
                .trim()
                .replace(/ñ/g, 'n')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[\s]+/g, '-')
                .replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-');

            // 2. Validación de unicidad Multi-Tenant (por local)
            const existeProductoEnLocal = await Producto.findOne({ slug, local: idLocal });
            if (existeProductoEnLocal) {
                console.log(`⚠️ Omitido por duplicado: ${tituloEs}`);
                errores.push(`Omitido "${tituloEs}": Ya existe un producto con un nombre similar en este local.`);
                continue;
            }

            try {
                // 3. Resolución o creación de Categoría
                const catNombreLimpio = catNombre.trim().replace(/\s+/g, ' ');
                const subcatEs = fila.subcategoria_es || 'General';
                let subcatEn = fila.subcategoria_en || '';

                let categoriaDB = await Categoria.findOne({
                    'nombre.es': { $regex: new RegExp(`^${catNombreLimpio}$`, 'i') },
                    local: idLocal
                });

                if (!categoriaDB) {
                    console.log(`🆕 Creando nueva categoría bilingüe: ${catNombreLimpio}`);
                    const slugCat = catNombreLimpio.toLowerCase().trim().replace(/[\s]+/g, '-');

                    const traduccionCat = await translate(catNombreLimpio, { from: 'es', to: 'en' })
                        .catch(() => ({ text: catNombreLimpio }));

                    if (subcatEs && !subcatEn) {
                        const tradSub = await translate(subcatEs, { from: 'es', to: 'en' }).catch(() => ({ text: subcatEs }));
                        subcatEn = tradSub.text;
                    }

                    categoriaDB = new Categoria({
                        nombre: { es: catNombreLimpio, en: traduccionCat.text },
                        icono: 'default-icon',
                        subcategorias: { es: subcatEs.trim(), en: subcatEn.trim() },
                        slug: `${slugCat}-${Date.now()}`,
                        local: idLocal,
                        status: 'Activo'
                    });
                    await categoriaDB.save();
                }

                // 4. Traducciones con salvavidas por si falla la API de Google Translate
                let tradTitulo = fila.titulo_en || '';
                let tradShort = fila.info_short_en || '';
                let tradDetalle = fila.detalle_en || '';

                try {
                    if (!tradTitulo) {
                        const t = await translate(tituloEs, { from: 'es', to: 'en' });
                        tradTitulo = t.text;
                    }
                    if (!tradShort && textoShort) {
                        const t = await translate(textoShort, { from: 'es', to: 'en' });
                        tradShort = t.text;
                    }
                    if (!tradDetalle && textoDetalle) {
                        const t = await translate(textoDetalle, { from: 'es', to: 'en' });
                        tradDetalle = t.text;
                    }
                } catch (tErr) {
                    console.log(`⚠️ Falla menor en traducción automática para "${tituloEs}". Usando textos en español como respaldo.`);
                    tradTitulo = tradTitulo || tituloEs;
                    tradShort = tradShort || textoShort;
                    tradDetalle = tradDetalle || textoDetalle;
                }

                // 🚀 SOLUCIÓN AL REQ.UID CORRUPTO/VACÍO: Si req.uid no viene del JWT, usamos el usuario dueño del local o un ID válido provisional
                const usuarioAsignado = req.uid || "6a1f5b66eac4ceea15147890"; // ID por defecto si no hay JWT activo en la ruta

                // 5. Instanciar y Guardar el Producto adaptado a tu esquema real de MongoDB
                const nuevoProducto = new Producto({
                    usuario: usuarioAsignado,
                    local: idLocal,
                    slug: slug,
                    sku: fila.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    precio_ahora: Number(fila.precio) || 0,
                    precio_antes: Number(fila.precio) || 0,
                    bajoPedido: fila.bajoPedido === 'true' || fila.bajoPedido === true,
                    stock: Number(fila.stock) || 0,
                    condition: fila.condition === 'used' ? 'used' : 'new',
                    categoria: categoriaDB._id,
                    subcategoria: subcatEs.trim().toLowerCase(),
                    status: 'Activo', // 🚀 Cambiado a Activo para que los veas listados de inmediato al importar
                    img: fila.imagenRef || '',
                    titulo: { es: tituloEs, en: tradTitulo },
                    info_short: { es: textoShort, en: tradShort },
                    detalle: { es: textoDetalle, en: tradDetalle },
                    ventas: 0
                });

                const productoGuardado = await nuevoProducto.save();
                console.log(`✅ ¡Producto guardado con éxito!: ${tituloEs} (_id: ${productoGuardado._id})`);

                // 🎨 Procesamiento complementario de colores
                if (fila.colores_hex) {
                    const bloquesColores = fila.colores_hex.split('|').map(c => c.trim());
                    for (const bloque of bloquesColores) {
                        const [tituloColor, valorHex] = bloque.split(':').map(str => str?.trim());
                        if (tituloColor && valorHex) {
                            const nuevoColorDoc = new Color({ titulo: tituloColor, color: valorHex, producto: productoGuardado._id });
                            await nuevoColorDoc.save();
                        }
                    }
                }

                // 🛠️ Procesamiento complementario de selectores
                const selectorNombreEs = String(fila.nombre_selector || '').trim();
                const variantesRaw = String(fila.variantes_selector || '').trim();

                if (selectorNombreEs && variantesRaw) {
                    // 1. Separamos las variantes por '|' y limpiamos espacios o valores vacíos
                    const listaVariantes = variantesRaw
                        .split('|')
                        .map(v => v.trim())
                        .filter(v => v !== '');

                    const selectoresIds = [];

                    // 2. Creamos un documento Selector por cada variante (el backend/hook traduce 'en' automáticamente)
                    for (const varianteEs of listaVariantes) {
                        const nuevoSelectorDoc = new Selector({
                            titulo: {
                                es: varianteEs
                            },
                            producto: productoGuardado._id
                        });

                        const selectorGuardado = await nuevoSelectorDoc.save();
                        selectoresIds.push(selectorGuardado._id);
                    }

                    // 3. Asignamos el nombre del grupo y los IDs creados al producto
                    productoGuardado.nombre_selector = selectorNombreEs;
                    productoGuardado.selector = selectoresIds;
                    await productoGuardado.save();
                }

                productosCreados.push(productoGuardado);

            } catch (err) {
                console.error(`❌ Error crítico guardando la fila de "${tituloEs}":`, err);
                errores.push(`Error en fila #${index + 1} ("${tituloEs}"): ${err.message}`);
            }
        }

        return res.json({
            ok: true,
            msg: `Procesamiento de lote finalizado.`,
            creados: productosCreados.length,
            fallidos: errores.length,
            errores
        });

    } catch (error) {
        console.error('🔴 Error crítico global en importación masiva:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador de sistemas',
            error: error.message
        });
    }
};




const vincularImagenesMasivas = async (req, res) => {
    try {
        // 🔍 DIAGNÓSTICO INICIAL EN CONSOLA
        console.log('🖼️ [WEBHOOK-IMÁGENES] Iniciando procesamiento de lote...');

        if (!req.files || Object.keys(req.files).length === 0) {
            console.log('⚠️ No se detectaron archivos en req.files');
            return res.status(400).json({ ok: false, msg: 'No se seleccionó ninguna imagen.' });
        }

        const idLocal = req.body.local;
        console.log('🆔 ID del local recibido en el body:', idLocal);

        if (!idLocal) {
            return res.status(400).json({ ok: false, msg: 'El ID del local es obligatorio para vincular las imágenes.' });
        }

        // Capturamos el lote bajo la clave 'imagenes' que envía tu Angular
        let loteImagenes = req.files.imagenes;
        if (!loteImagenes) {
            console.log('⚠️ No se encontraron archivos bajo la clave "imagenes"');
            return res.status(400).json({ ok: false, msg: 'Asegúrate de enviar las fotos bajo la propiedad "imagenes".' });
        }

        // 🚀 NORMALIZACIÓN TOTAL: Forzamos a que siempre sea un Arreglo iterable
        if (!Array.isArray(loteImagenes)) {
            loteImagenes = [loteImagenes];
        }

        console.log(`📊 Total de fotos recibidas en el servidor: ${loteImagenes.length}`);

        const vinculados = [];
        const noEncontrados = [];
        const extensionesValidas = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
        const MAX_SIZE_MB = 3;
        const bytesLimit = MAX_SIZE_MB * 1024 * 1024;

        // Procesamos secuencialmente o en paralelo controlado para evitar saturar tu cuota de Cloudinary
        for (const [index, file] of loteImagenes.entries()) {
            const nombreArchivoOriginal = file.name;
            console.log(`📸 [#${index + 1}] Procesando archivo físico: "${nombreArchivoOriginal}"`);

            if (file.size > bytesLimit) {
                console.log(`❌ ${nombreArchivoOriginal} excede el tamaño límite.`);
                noEncontrados.push(`${nombreArchivoOriginal} (Excede el límite de ${MAX_SIZE_MB}MB)`);
                continue;
            }

            const nombreCortado = nombreArchivoOriginal.split('.');
            const extensionArchivo = nombreCortado[nombreCortado.length - 1].toLowerCase();

            if (!extensionesValidas.includes(extensionArchivo)) {
                console.log(`❌ ${nombreArchivoOriginal} tiene un formato no válido.`);
                noEncontrados.push(`${nombreArchivoOriginal} (Formato no permitido)`);
                continue;
            }

            try {
                // 🛠️ SOPORTE EXTREMO PARA TEMP FILES: Si express-fileupload guardó en disco temporal, leemos el path
                let pathParaSubir = file.tempFilePath;

                // Si por alguna razón tempFilePath viene vacío, creamos un DataURI desde el buffer en memoria
                if (!pathParaSubir && file.data) {
                    const base64Image = Buffer.from(file.data).toString('base64');
                    pathParaSubir = `data:${file.mimetype};base64,${base64Image}`;
                }

                if (!pathParaSubir) {
                    console.log(`❌ No se pudo leer el archivo binario para: ${nombreArchivoOriginal}`);
                    noEncontrados.push(`${nombreArchivoOriginal} (Archivo corrupto en la subida)`);
                    continue;
                }

                // Extraer el nombre del archivo sin la extensión .jpg/.png para pasarlo al public_id de Cloudinary
                const nombreLimpioSinExt = nombreArchivoOriginal.substring(0, nombreArchivoOriginal.lastIndexOf('.'))
                    .toLowerCase()
                    .trim()
                    .replace(/[\s]+/g, '_')
                    .replace(/[^\w\-]+/g, '');

                const publicIdMultiTenant = `local_${idLocal}_${nombreLimpioSinExt}_${Date.now()}`;

                console.log(`☁️ Subiendo a Cloudinary con public_id: ${publicIdMultiTenant}`);

                // 4. Subir de forma segura a tu cuenta de Cloudinary
                const result = await cloudinary.uploader.upload(pathParaSubir, {
                    folder: `zlipmenu/uploads/productos/local_${idLocal}/`,
                    public_id: publicIdMultiTenant,
                    transformation: [
                        { width: 1000, crop: "limit" },
                        { quality: "auto" },
                        { fetch_format: "auto" }
                    ]
                });

                console.log(`✅ Subido a Cloudinary con éxito: ${result.secure_url}`);

                // 5. Vincular al producto cuyo campo "img" coincida exactamente con la columna imagenRef del Excel ("hamburguesa.jpg")
                // Hacemos una búsqueda insensible a mayúsculas/minúsculas para el match del string
                const productoActualizado = await Producto.findOneAndUpdate(
                    {
                        local: idLocal,
                        img: { $regex: new RegExp(`^${nombreArchivoOriginal.trim()}$`, 'i') }
                    },
                    {
                        img: result.secure_url, // Sobrescribimos el string del archivo con la URL oficial de Cloudinary 🎉
                        status: 'Activo'       // Lo activamos para que brille en la app del cliente
                    },
                    { new: true }
                );

                if (productoActualizado) {
                    console.log(`🔗 [VINCULADO] La foto "${nombreArchivoOriginal}" se acopló con éxito al producto: "${productoActualizado.titulo.es}"`);
                    vinculados.push(productoActualizado.titulo.es);
                } else {
                    console.log(`⚠️ La foto "${nombreArchivoOriginal}" se subió, pero ningún producto en tu MongoDB tiene guardado ese nombre exacto en su campo "img".`);
                    noEncontrados.push(`${nombreArchivoOriginal} (No coincide con la columna imagenRef del Excel)`);
                }

            } catch (err) {
                console.error(`🔴 Error crítico procesando archivo individual ${nombreArchivoOriginal}:`, err);
                noEncontrados.push(`${nombreArchivoOriginal} (Error en el servidor/Cloudinary)`);
            }
        }

        // Respuesta final unificada compatible con tu interfaz de reportes de Angular
        return res.json({
            ok: true,
            msg: 'Procesamiento de imágenes finalizado',
            total_recibidas: loteImagenes.length,
            vinculados_count: vinculados.length,
            no_vinculados_count: noEncontrados.length,
            vinculados,
            noEncontrados
        });

    } catch (error) {
        console.error('🔴 Error crítico global en vinculación masiva de imágenes:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Hubo un error al procesar el lote de imágenes en el servidor',
            error: error.message
        });
    }
};


const descargarPlantillaExcel = async (req, res) => {
    try {
        // Estructura de muestra para la plantilla de productos masivos
        const dataPlantilla = [
            {
                titulo_es: "Hamburguesa Especial",
                titulo_en: "Special Burger",
                sku: "HAM-001",
                precio: 12.50,
                stock: 50,
                bajoPedido: false,
                condition: "new",

                // 🎯 CONTROL DE CATEGORÍAS AUTOMATIZADAS
                nombre_categoria: "Hamburguesas",
                subcategoria_es: "Clásicas",

                colores_hex: "Amarillo:#FFCC00 | Rojo:#FF0000",
                nombre_selector: "Sabor",
                variantes_selector: "Pollo | Carne | Mixta",
                info_short_es: "Con papas fritas y aderezo de la casa",
                detalle_es: "Carne de res de 200g, queso cheddar fundido...",
                imagenRef: "hamburguesa.jpg"
            },
            {
                titulo_es: "Pasta Fettuccine de la Casa",
                titulo_en: "House Fettuccine Pasta",
                sku: "PAS-002",
                precio: 10.99,
                stock: 40,
                bajoPedido: false,
                condition: "new",

                // 🎯 CONTROL DE CATEGORÍAS AUTOMATIZADAS
                nombre_categoria: "Pastas",
                subcategoria_es: "Artesanales",

                colores_hex: "",
                nombre_selector: "Salsa",
                variantes_selector: "Boloñesa | Pesto | Alfredo",
                info_short_es: "Pasta fresca artesanal",
                detalle_es: "Preparada al momento con auténtico queso parmesano...",
                imagenRef: "pasta.jpg"
            }
        ];

        const workbook = XLSX.utils.book_new();

        // Convertir el JSON plano a una hoja de cálculo limpia
        const worksheet = XLSX.utils.json_to_sheet(dataPlantilla);

        // Adjuntar la hoja al libro de trabajo
        XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla Productos");

        // Generar el Buffer de salida para la descarga directa
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Configuración de cabeceras HTTP para la descarga del archivo binario
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=plantilla_productos_zlipmenu.xlsx');

        return res.send(buffer);

    } catch (error) {
        console.error('Error generando plantilla con atributos:', error);
        return res.status(500).json({ ok: false, msg: 'No se pudo generar la plantilla.' });
    }
};


// ==========================================
// Cargar categorías desde Excel (Módulo Independiente)
// ==========================================
const importarCategoriasExcel = async (req, res) => {
    try {
        if (!req.files || !req.files.excel) {
            return res.status(400).json({ ok: false, msg: 'No se subió ningún archivo de Excel o CSV.' });
        }

        const idLocal = req.body.local; // Aislamiento Multi-Tenant
        if (!idLocal) {
            return res.status(400).json({ ok: false, msg: 'El ID del local es obligatorio.' });
        }

        const archivo = req.files.excel;
        const workbook = XLSX.read(archivo.data, { type: 'buffer' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const datos = XLSX.utils.sheet_to_json(worksheet);

        const categoriasCreadas = [];
        const errores = [];

        for (const fila of datos) {
            const nombreEs = fila.nombre_es || '';
            const nombreEn = fila.nombre_en || '';
            const icono = fila.icono || 'default-icon';
            const status = fila.status || 'Activo';

            if (!nombreEs) {
                errores.push(`Fila omitida: El campo 'nombre_es' es mandatorio.`);
                continue;
            }

            // Crear slug de categoría
            const slugCat = nombreEs
                .toLowerCase()
                .trim()
                .replace(/ñ/g, 'n')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[\s]+/g, '-')
                .replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-');

            // Verificar si ya existe en el local para evitar duplicados masivos
            const existeCat = await Categoria.findOne({
                'nombre.es': { $regex: new RegExp(`^${nombreEs.trim()}$`, 'i') },
                local: idLocal
            });

            if (existeCat) {
                errores.push(`Omitida "${nombreEs}": Ya existe esta categoría en este local.`);
                continue;
            }

            try {
                let traduccionEn = nombreEn.trim();

                // Si el usuario no especificó la traducción en inglés, la generamos automáticamente
                if (!traduccionEn) {
                    const trad = await translate(nombreEs, { from: 'es', to: 'en' }).catch(() => ({ text: '' }));
                    traduccionEn = trad.text;
                }

                const nuevaCategoria = new Categoria({
                    nombre: {
                        es: nombreEs.trim(),
                        en: traduccionEn
                    },
                    icono: icono.trim(),
                    slug: `${slugCat}-${Date.now()}`, // Prevenir colisiones globales de slug
                    status: status,
                    local: idLocal,
                    usuario: req.uid
                });

                const catGuardada = await nuevaCategoria.save();
                categoriasCreadas.push(catGuardada.nombre.es);

            } catch (err) {
                console.error(`Error procesando categoría ${nombreEs}:`, err);
                errores.push(`Error en "${nombreEs}": ${err.message}`);
            }
        }

        return res.json({
            ok: true,
            msg: `Procesamiento de categorías finalizado.`,
            creados: categoriasCreadas.length,
            fallidos: errores.length,
            errores
        });

    } catch (error) {
        console.error('Error crítico en importación masiva de categorías:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador de sistemas',
            error: error.message
        });
    }
};


module.exports = {
    importarProductosExcel,
    vincularImagenesMasivas,
    descargarPlantillaExcel,
    importarCategoriasExcel

};
