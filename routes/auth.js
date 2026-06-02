/*
    Ruta: /api/login
*/
const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { 
    login, 
    loginExpress,
    googleSignIn, 
    renewToken,
    forgotPassword,
changeforgotPassword,
resetPassword,
changePassword,
 } = require('../controllers/auth');
const { validarJWT } = require('../middlewares/validar-jwt');


const router = Router();

router.post('/', [
    check('email', 'el email es obligatorio').isEmail(),
    check('password', 'el password es obligatorio').not().isEmpty(),
    validarCampos
], login);

router.post('/express', [
    check('telefono', 'El teléfono es obligatorio').not().isEmpty(),
    validarCampos
], loginExpress);

router.post('/google', [
    check('token', 'el token es obligatorio').not().isEmpty(),
    validarCampos

], googleSignIn);

router.post('/forgot-password', [
    check('email', 'El email es obligatorio').isEmail().not().isEmpty(),
    validarCampos
], forgotPassword);

router.post('/change-forgot-password', [
    check('email', 'El email es obligatorio').isEmail().not().isEmpty(),
    validarCampos
], changeforgotPassword);

router.post('/reset-password', [
    check('email', 'El email es obligatorio').isEmail().not().isEmpty(),
    check('token', 'El token es obligatorio').not().isEmpty(),
    validarCampos
], resetPassword);

router.post('/change-password', [
    check('email', 'El email es obligatorio').isEmail().not().isEmpty(),
    check('token', 'El token es obligatorio').not().isEmpty(),
    check('password', 'La nueva contraseña es obligatoria (mín 6 chars)').isLength({ min: 6 }),
    validarCampos
], changePassword);

router.get('/renew', validarJWT, renewToken);


module.exports = router;

