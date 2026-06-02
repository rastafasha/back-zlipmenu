const { response } = require('express');
const Usuario = require('../models/usuario');
const bcrypt = require('bcryptjs');
const { generarJWT } = require('../helpers/jwt');
const { googleVerify } = require('../helpers/google-verify');
const { getMenuFrontEnd } = require('../helpers/menu-frontend');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');


const login = async (req, res) => {

    const { email, password } = req.body;

    try {
        //verificar email
        const usuarioDB = await Usuario.findOne({ email });

        if (!usuarioDB) {
            return res.status(404).json({
                ok: false,
                msg: 'email no encontrado'
            });
        }

        //verificar password
        const validPassword = bcrypt.compareSync(password, usuarioDB.password);
        if (!validPassword) {
            return res.status(400).json({
                ok: false,
                msg: 'Contraseña no valida'
            });
        }

        //generar el token - JWT
        const token = await generarJWT(usuarioDB.id);

        res.json({
            ok: true,
            token,
            usuario: usuarioDB,
            menu: getMenuFrontEnd(usuarioDB.role)
        })

    } catch (error) {
        // console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'hable con el admin'
        });
    }
};

const loginExpress = async (req, res) => {
    // Con esto extraes el teléfono sin importar si el frontend envía campos extra como first_name o remember
    const { telefono } = req.body; 

    try {
        // Ahora Mongoose recibirá un string limpio y no un objeto
        const usuario = await Usuario.findOne({ telefono });
        
        if (!usuario) {
            return res.status(404).json({ ok: false, msg: 'No registrado' });
        }

        const token = await generarJWT(usuario.id);
        return res.json({ ok: true, usuario, token });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, msg: 'Error en el servidor' });
    }
}



const googleSignIn = async (req, res = response) => {

    const googleToken = req.body.token;

    try {

        const { name, email, picture } = await googleVerify(googleToken);

        const usuarioDB = await Usuario.findOne({ email });
        let usuario;

        if (!usuarioDB) {
            //si no existe el usuario
            usuario = new Usuario({
                nombre: name,
                email,
                password: '@@@',
                img: picture,
                google: true,

            });
        } else {
            //existe usuario
            usuario = usuarioDB;
            usuario.google = true;
        }

        //guardar en bd
        await usuario.save();

        //generar el token - JWT
        const token = await generarJWT(usuario.id);

        res.json({
            ok: true,
            token,
            menu: getMenuFrontEnd(usuario.role)
        });

    } catch (error) {
        res.status(401).json({
            ok: false,
            msg: 'Token no es correcto',
        });
    }


};

const renewToken = async (req, res = response) => {

    const uid = req.uid

    //generar el token - JWT
    const token = await generarJWT(uid);

    // obenter el usuario por uid
    const usuario = await Usuario.findById(uid);

    res.json({
        ok: true,
        token,
        usuario,
        menu: getMenuFrontEnd(usuario.role)
    });
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const usuario = await Usuario.findOne({ email });
        if (!usuario) {
            return res.status(404).json({
                ok: false,
                msg: 'Email no encontrado'
            });
        }

        // Generate 6-digit token
        const token = Math.floor(Math.random() * (999999 - 100000) + 100000);
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

        // Save token and expiry
        usuario.recovery_token = token.toString();
        usuario.recovery_expires = expires;
        await usuario.save();

        // Send email (fixed nodemailer)
        var transporter = nodemailer.createTransport(smtpTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 587,
            auth: {
                user: 'mercadocreativo@gmail.com',
                pass: 'pdnknnhpjijutcau'
            }
        }));

        var mailOptions = {
            from: 'mercadocreativo@gmail.com',
            to: email,
            subject: 'Código de recuperación de contraseña - MallConnect',
            text: `Tu código de recuperación es: ${token}
Válido por 10 minutos.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending email:', error);
            } else {
                console.log('Recovery email sent: ' + info.response);
            }
        });

        res.json({
            ok: true,
            msg: 'Código de recuperación enviado al email'
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error en servidor'
        });
    }
};

const resetPassword = async (req, res) => {
    const { email, token } = req.body;

    try {
        const usuario = await Usuario.findOne({ email });
        if (!usuario) {
            return res.status(404).json({
                ok: false,
                msg: 'Usuario no encontrado'
            });
        }

        if (!usuario.recovery_token || usuario.recovery_token !== token.toString()) {
            return res.status(400).json({
                ok: false,
                msg: 'Token inválido'
            });
        }

        if (usuario.recovery_expires && usuario.recovery_expires < new Date()) {
            return res.status(400).json({
                ok: false,
                msg: 'Token expirado'
            });
        }

        res.json({
            ok: true,
            msg: 'Token verificado correctamente. Proceda a cambiar la contraseña.'
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error en servidor'
        });
    }
};

const changeforgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const usuario = await Usuario.findOne({ email });
        if (!usuario) {
            return res.status(404).json({
                ok: false,
                msg: 'Email no encontrado'
            });
        }

        // Generate new 6-digit token
        const newToken = Math.floor(Math.random() * (999999 - 100000) + 100000);
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

        usuario.recovery_token = newToken.toString();
        usuario.recovery_expires = expires;
        await usuario.save();

        // Send email (fixed nodemailer)
        var transporter = nodemailer.createTransport(smtpTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 587,
            auth: {
                user: 'mercadocreativo@gmail.com',
                pass: 'pdnknnhpjijutcau'
            }
        }));

        var mailOptions = {
            from: 'mercadocreativo@gmail.com',
            to: email,
            subject: 'Nuevo código de recuperación - MallConnect',
            text: `Tu nuevo código de recuperación es: ${newToken}
Válido por 10 minutos.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending email:', error);
            } else {
                console.log('New recovery email sent: ' + info.response);
            }
        });

        res.json({
            ok: true,
            msg: 'Nuevo código de recuperación enviado al email'
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error en servidor'
        });
    }
};

const changePassword = async (req, res) => {
    const { email, token, password } = req.body;

    try {
        const usuario = await Usuario.findOne({ email });
        if (!usuario) {
            return res.status(404).json({
                ok: false,
                msg: 'Usuario no encontrado'
            });
        }

        if (!usuario.recovery_token || usuario.recovery_token !== token.toString()) {
            return res.status(400).json({
                ok: false,
                msg: 'Token inválido'
            });
        }

        if (usuario.recovery_expires && usuario.recovery_expires < new Date()) {
            return res.status(400).json({
                ok: false,
                msg: 'Token expirado'
            });
        }

        // Hash new password
        const salt = bcrypt.genSaltSync();
        usuario.password = bcrypt.hashSync(password, salt);

        // Clear recovery data
        usuario.recovery_token = null;
        usuario.recovery_expires = null;
        await usuario.save();

        res.json({
            ok: true,
            msg: 'Contraseña actualizada exitosamente'
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error en servidor'
        });
    }
};

module.exports = {
    login,
    loginExpress,
    googleSignIn,
    renewToken,
    forgotPassword,
    changeforgotPassword,
    resetPassword,
    changePassword,
};
