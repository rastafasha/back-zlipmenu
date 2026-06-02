const path = require('path');
const fs = require('fs');
const { response } = require('express');
const { v4: uuidv4 } = require('uuid');
const { actualizarImagen } = require('../helpers/actualizar-imagen');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const cloudinary = require('cloudinary').v2;

// configurar cloudinary
cloudinary.config({
    api_key: process.env.API_KEY_CLOUDINARY,
    api_secret: process.env.API_SECRET_CLOUDINARY,
    cloud_name: process.env.CLOUD_NAME
})

const fileUpload = async (req, res = response) => {
    const tipo = req.params.tipo;
    const id = req.params.id;

    // 1. Validar tipos de carpetas/colecciones
    const tiposValidos = [
        'productos', 'marcas', 'locaciones', 'galerias', 'promocions',
        'congenerals', 'usuarios', 'ingresos', 'blogs', 'pages', 'cursos', 
        'sliders', 'categorias', 'drivers', 'transferencias'
    ];
    
    if (!tiposValidos.includes(tipo)) {
        return res.status(400).json({ ok: false, msg: 'Tipo de colección no permitido' });
    }

    // 2. Validar que venga un archivo
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ ok: false, msg: 'No se seleccionó ninguna imagen' });
    }

    const file = req.files.imagen;

    // 3. VALIDACIÓN estricta de 3MB
    const MAX_SIZE_MB = 3;
    const bytesLimit = MAX_SIZE_MB * 1024 * 1024;
    
    if (file.size > bytesLimit) {
        return res.status(400).json({
            ok: false,
            msg: `La imagen supera el límite de ${MAX_SIZE_MB}MB. Por favor, sube una más ligera.`
        });
    }

    // 4. Validar extensión
    const nombreCortado = file.name.split('.');
    const extensionArchivo = nombreCortado[nombreCortado.length - 1].toLowerCase();
    const extensionesValidas = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

    if (!extensionesValidas.includes(extensionArchivo)) {
        return res.status(400).json({ ok: false, msg: 'Formato no permitido (usa jpg, png o webp)' });
    }

    try {
        // 5. Convertir el Buffer a Data URI (Evita usar el disco duro de Render)
        const base64Image = Buffer.from(file.data).toString('base64');
        const dataURI = `data:${file.mimetype};base64,${base64Image}`;

        // 6. Subir a Cloudinary con Transformaciones Automáticas
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: `mallConnect/uploads/${tipo}/`,
            public_id: uuidv4(),
            transformation: [
                { width: 1000, crop: "limit" }, // Redimensiona si es gigante
                { quality: "auto" },            // Compresión inteligente (ahorra mucho ancho de banda)
                { fetch_format: "auto" }        // Entrega el mejor formato según el navegador del cliente
            ]
        });

        const urlImagen = result.secure_url;

        // 🛠️ CAPTURAMOS EL CAMPO DESTINO (Opcional, con fallback al comportamiento normal)
        // Ejemplo: req.query.campo puede ser 'img' o 'img_hero'
        const campoDestino = req.query.campo || null;

         // 7. Actualizar tu Base de Datos pasándole el campo específico
        await actualizarImagen(tipo, id, urlImagen, campoDestino);

        res.json({
            ok: true,
            msg: 'Imagen subida y optimizada con éxito',
            nombreArchivo: urlImagen
        });

    } catch (error) {
        console.error('Error Cloudinary:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Hubo un error al procesar la imagen en el servidor',
            error: error.message
        });
    }
};
const retornaImagen = (req, res) => {
    const tipo = req.params.tipo;
    const foto = req.params.foto;

    const pathImg = path.join(__dirname, `../uploads/${tipo}/${foto}`);
    
    //traigo la foto desde cloudinary
    const urlImg = cloudinary.url(foto, {
        width: 300,
        height: 300,
        crop: 'fill'
    });

    //imagen por defecto
    if (fs.existsSync(pathImg)) {
        res.sendFile(pathImg);
    } else {
        const pathImg = path.join(__dirname, `../uploads/${tipo}/no-image.jpg`);
        res.sendFile(pathImg);
    }
};

module.exports = {
    fileUpload,
    retornaImagen
}
