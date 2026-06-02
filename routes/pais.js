/*
 Ruta: /api/paises
 */

const { Router } = require('express');
const router = Router();
const {
    getPaises,
    getPais,
    getPaisByCode,
    crearPais,
    actualizarPais,
    borrarPais
} = require('../controllers/paisController');

const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getPaises);
router.get('/code/:code', getPaisByCode);
router.get('/:id', getPais);

router.post('/', [
    check('code', 'El código del país es necesario').not().isEmpty(),
    check('pais', 'El nombre del país es necesario').not().isEmpty(),
    validarCampos
], crearPais);

router.put('/:id', [
    check('code', 'El código del país es necesario').not().isEmpty(),
    check('pais', 'El nombre del país es necesario').not().isEmpty(),
    validarCampos
], actualizarPais);

router.delete('/:id', validarJWT, borrarPais);

module.exports = router;

