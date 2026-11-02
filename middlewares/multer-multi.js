const multer = require('multer');

// Configuración en memoria para no saturar el disco duro del servidor (Ideal para Render/Heroku)
const storage = multer.memoryStorage();

const uploadLimit = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite máximo de 5MB por imagen
    fileFilter: (req, file, cb) => {
        // Validar que solo se suban formatos de imágenes permitidos
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Formato no válido. Solo se admiten archivos de imagen.'), false);
        }
    }
});

// Aceptará un lote de hasta 30 imágenes simultáneas bajo el campo 'imagenes'
const cargarImagenesMultiples = uploadLimit.array('imagenes', 30);

module.exports = { cargarImagenesMultiples };