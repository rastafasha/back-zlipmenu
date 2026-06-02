/*
 Ruta: /api/galerias
 */

const { Router } = require('express');
const router = Router();
const {
    getGalerias,
    actualizarGaleria,
    borrarGaleria,
    getGaleria,
    findByProduct,
    registro
} = require('../controllers/galeriaController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const fs = require('fs');
const pathModule = require('path');
var multipart = require('connect-multiparty');

const uploadDir = pathModule.resolve(__dirname, '../uploads/galerias');
const parentDir = pathModule.resolve(__dirname, '../uploads');

// console.log('Upload directory path:', uploadDir);  // Added log to verify path

// Ensure the parent upload directory exists
try {
    if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir);
    }
} catch (error) {
    console.error('Error creating parent upload directory:', error);
}

// Ensure the upload directory exists
try {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
    }
} catch (error) {
    console.error('Error creating upload directory:', error);
}

var path = multipart({ uploadDir: uploadDir });

router.get('/', getGalerias);



router.post('/registro', path, registro);

router.post('/', [
    validarJWT,
    check('imagen', 'El tipo del imagen es necesario').not().isEmpty(),
    validarCampos
], registro);

router.put('/:id', [
    validarJWT,
    check('imagen', 'El tipo del imagen es necesario').not().isEmpty(),
    validarCampos
], actualizarGaleria);

router.delete('/:id', validarJWT, borrarGaleria);

router.get('/:id', getGaleria);

router.get('/galeria_producto/find/:id?', findByProduct);



module.exports = router;