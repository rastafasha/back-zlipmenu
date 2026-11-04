const { response } = require('express');
const Producto = require('../models/producto');
const Categoria = require('../models/categoria');
const Selector = require('../models/selector');
const Color = require('../models/color');
const translate = require('google-translate-api-x');
const XLSX = require('xlsx');
const cloudinary = require('cloudinary').v2;

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
        const workbook = XLSX.read(archivo.data, { type: 'buffer' });
        const worksheet = workbook.Sheets[workbook.SheetNames];
        const datos = XLSX.utils.sheet_to_json(worksheet);

        const productosCreados = [];
        const errores = [];

        for (const fila of datos) {
            const tituloEs = fila.titulo_es || '';
            const textoShort = fila.info_short_es || '';
            const textoDetalle = fila.detalle_es || '';
            const catNombre = fila.nombre_categoria || 'General';

            if (!tituloEs) {
                errores.push(`Fila omitida: El campo 'titulo_es' es mandatorio.`);
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
                errores.push(`Omitido "${tituloEs}": Ya existe un producto con un nombre similar en este local.`);
                continue;
            }

            try {
                // 3. Resolución de Categoría Bilingüe (Búsqueda o creación inteligente)
                let categoriaDB = await Categoria.findOne({ 
                    'nombre.es': { $regex: new RegExp(`^${catNombre.trim()}$`, 'i') }, 
                    local: idLocal 
                });

                if (!categoriaDB) {
                    const slugCat = catNombre.toLowerCase().trim().replace(/[\s]+/g, '-');
                    const traduccionCat = await translate(catNombre, { from: 'es', to: 'en' }).catch(() => ({ text: '' }));
                    
                    categoriaDB = new Categoria({
                        nombre: {
                            es: catNombre.trim(),
                            en: traduccionCat.text
                        },
                        slug: `${slugCat}-${Date.now()}`,
                        local: idLocal,
                        usuario: req.uid
                    });
                    await categoriaDB.save();
                }

                // 4. Traducciones automáticas en paralelo por IA para el producto raíz
                const [traducirTitulo, traducirInfoShort, traducirDetalle] = await Promise.all([
                    translate(tituloEs, { from: 'es', to: 'en' }).catch(() => ({ text: fila.titulo_en || '' })),
                    translate(textoShort, { from: 'es', to: 'en' }).catch(() => ({ text: '' })),
                    translate(textoDetalle, { from: 'es', to: 'en' }).catch(() => ({ text: '' }))
                ]);

                // 5. Instanciar y Guardar primero el Producto raíz en MongoDB Atlas
                const nuevoProducto = new Producto({
                    usuario: req.uid,
                    local: idLocal,
                    slug: slug,
                    sku: fila.sku || `SKU-${Date.now()}`,
                    precio_ahora: Number(fila.precio) || 0,
                    precio_antes: Number(fila.precio) || 0,
                    bajoPedido: false || true,
                    stock: Number(fila.stock) || 0,
                    condition: fila.condition === 'used' ? 'used' : 'new',
                    categoria: categoriaDB._id,
                    status: 'Desactivado', 
                    img: fila.imagenRef || '', 
                    titulo: { es: tituloEs, en: traducirTitulo.text || fila.titulo_en || '' },
                    info_short: { es: textoShort, en: traducirInfoShort.text },
                    detalle: { es: textoDetalle, en: traducirDetalle.text },
                    ventas: 0
                });

                const productoGuardado = await nuevoProducto.save();

                // =========================================================================
                // 🎨 PROCESAMIENTO DE COLORES ASOCIADOS AL PRODUCTO
                // =========================================================================
                if (fila.colores_hex) {
                    const bloquesColores = fila.colores_hex.split('|').map(c => c.trim());

                    for (const bloque of bloquesColores) {
                        const [tituloColor, valorHex] = bloque.split(':').map(str => str?.trim());
                        if (tituloColor && valorHex) {
                            const nuevoColorDoc = new Color({
                                titulo: tituloColor,
                                color: valorHex,
                                producto: productoGuardado._id
                            });
                            await nuevoColorDoc.save();
                        }
                    }
                }

                // =========================================================================
                // 🛠️ PROCESAMIENTO DE SELECTORES DINÁMICOS UNIVERSALES
                // =========================================================================
                const selectorNombreEs = fila.nombre_selector || '';
                const variantesRaw = fila.variantes_selector || '';

                if (selectorNombreEs && variantesRaw) {
                    const opcionesLimpias = variantesRaw.split('|').map(o => o.trim()).join(', ');

                    const traducirSelector = await translate(selectorNombreEs, { from: 'es', to: 'en' }).catch(() => ({ text: '' }));

                    const nuevoSelectorDoc = new Selector({
                        titulo: {
                            es: selectorNombreEs.trim(),
                            en: traducirSelector.text || selectorNombreEs.trim()
                        },
                        producto: productoGuardado._id,
                        estado: opcionesLimpias
                    });

                    const selectorGuardado = await nuevoSelectorDoc.save();

                    productoGuardado.selector = selectorGuardado._id;
                    productoGuardado.nombre_selector = selectorNombreEs.trim();
                    await productoGuardado.save();
                }

                productosCreados.push(productoGuardado);

            } catch (err) {
                console.error(`Error procesando fila de ${tituloEs}:`, err);
                errores.push(`Error en "${tituloEs}": ${err.message}`);
            }
        }

        return res.json({
            ok: true,
            msg: `Procesamiento de lote finalizado con éxito.`,
            creados: productosCreados.length,
            fallidos: errores.length,
            errores
        });

    } catch (error) {
        console.error('Error crítico en importación masiva:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador de sistemas',
            error: error.message
        });
    }
};


const vincularImagenesMasivas = async (req, res) => {
    try {
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ ok: false, msg: 'No se seleccionó ninguna imagen.' });
        }

        const idLocal = req.body.local; 
        if (!idLocal) {
            return res.status(400).json({ ok: false, msg: 'El ID del local es obligatorio.' });
        }

        let loteImagenes = req.files.imagenes; 
        if (!Array.isArray(loteImagenes)) {
            loteImagenes = [loteImagenes];
        }

        const vinculados = [];
        const noEncontrados = [];
        const extensionesValidas = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
        const MAX_SIZE_MB = 3;
        const bytesLimit = MAX_SIZE_MB * 1024 * 1024;

        const promesasDeCarga = loteImagenes.map((file) => {
            return new Promise(async (resolve) => {
                const nombreArchivoOriginal = file.name; 

                if (file.size > bytesLimit) {
                    noEncontrados.push(`${nombreArchivoOriginal} (Excede el límite de ${MAX_SIZE_MB}MB)`);
                    return resolve();
                }

                const nombreCortado = nombreArchivoOriginal.split('.');
                const extensionArchivo = nombreCortado[nombreCortado.length - 1].toLowerCase();
                if (!extensionesValidas.includes(extensionArchivo)) {
                    noEncontrados.push(`${nombreArchivoOriginal} (Formato no permitido)`);
                    return resolve();
                }

                try {
                    // 3. Convertir el buffer en Data URI
                    const base64Image = Buffer.from(file.data).toString('base64');
                    const dataURI = `data:${file.mimetype};base64,${base64Image}`;

                    // 🛠️ NUEVO: Extraer el nombre del archivo sin la extensión .jpg/.png para pasarlo al public_id
                    const nombreLimpioSinExt = nombreArchivoOriginal.substring(0, nombreArchivoOriginal.lastIndexOf('.'))
                        .toLowerCase()
                        .trim()
                        .replace(/[\s]+/g, '_')
                        .replace(/[^\w\-]+/g, '');

                    // Generamos el identificador único del Tenant para el nombre físico del archivo
                    const publicIdMultiTenant = `local_${idLocal}_${nombreLimpioSinExt}`;

                    // 4. Subir a Cloudinary aplicando tus optimizaciones automáticas y el nombre real
                    const result = await cloudinary.uploader.upload(dataURI, {
                        folder: `zlipmenu/uploads/productos/local_${idLocal}/`,
                        public_id: publicIdMultiTenant, // ✅ Nombre real precedido por el ID de la tienda
                        transformation: [
                            { width: 1000, crop: "limit" }, 
                            { quality: "auto" },            
                            { fetch_format: "auto" }        
                        ]
                    });

                    // 5. Buscar el producto que guarde temporalmente este nombre de archivo en "img"
                    const productoActualizado = await Producto.findOneAndUpdate(
                        { 
                            local: idLocal, 
                            img: nombreArchivoOriginal // Sigue haciendo match perfecto con la columna imagenRef
                        },
                        { 
                            img: result.secure_url, // Guarda la URL final de Cloudinary
                            status: 'Activo'       
                        },
                        { new: true }
                    );

                    if (productoActualizado) {
                        vinculados.push(productoActualizado.titulo.es);
                    } else {
                        noEncontrados.push(`${nombreArchivoOriginal} (No coincide con ningún producto importado en el Excel)`);
                    }

                } catch (err) {
                    console.error(`Error procesando archivo ${nombreArchivoOriginal}:`, err);
                    noEncontrados.push(`${nombreArchivoOriginal} (Error en el servidor/Cloudinary)`);
                }

                resolve();
            });
        });

        await Promise.all(promesasDeCarga);

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
        console.error('Error crítico en vinculación masiva:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Hubo un error al procesar el lote de imágenes en el servidor',
            error: error.message
        });
    }
};



const descargarPlantillaExcel = async (req, res) => {
    try {
        const dataPlantilla = [
            {
                titulo_es: "Hamburguesa Especial",
                titulo_en: "Special Burger",
                sku: "HAM-001",
                precio: 12.50,
                bajoPedido: false,
                stock: 50,
                condition: "new",
                nombre_categoria: "Hamburguesas",
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
                nombre_categoria: "Pastas",
                colores_hex: "",
                nombre_selector: "Salsa",
                variantes_selector: "Boloñesa | Pesto | Alfredo",
                info_short_es: "Pasta fresca artesanal",
                detalle_es: "Preparada al momento con auténtico queso parmesano...",
                imagenRef: "pasta.jpg"
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(dataPlantilla);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla Productos");

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=plantilla_productos_saas.xlsx');
        
        return res.send(buffer);

    } catch (error) {
        console.error('Error generando plantilla con atributos:', error);
        return res.status(500).json({ ok: false, msg: 'No se pudo generar la plantilla.' });
    }
};



module.exports = {
    importarProductosExcel,
    vincularImagenesMasivas,
    descargarPlantillaExcel

};
