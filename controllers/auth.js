const { response } = require('express');
const Usuario = require('../models/usuario');
const bcrypt = require('bcryptjs');
const { generarJWT } = require('../helpers/jwt');
const { googleVerify } = require('../helpers/google-verify');
const { getMenuFrontEnd } = require('../helpers/menu-frontend');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const { crearUsuarios } = require('./usuarios');
const { crearTienda } = require('./tiendaController');
const { randomBytes } = require('node:crypto');
const { enviarMensajeWhatsApp } = require('../helpers/whatsapp-helper');

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

const registrarLocalAprobado = async (req, res) => {
    // Guardamos las referencias originales de Express para proteger el flujo global
    const resOriginalJson = res.json;
    const resOriginalStatus = res.status;

    let usuarioCreadoId = null; // Almacén dinámico para rastrear si debemos hacer rollback

    try {
        const { nombreDueno, email, telefono, nombreLocal, slugDeseado } = req.body;

        // Generamos una contraseña temporal aleatoria segura para el nuevo administrador
        const contrasenaTemporal = randomBytes(6).toString('hex'); // Ej: 'e4f1a9b2'

        // ==========================================
        // PASO 1: CREAR EL USUARIO ADMINISTRADOR
        // ==========================================
        const resultadoUsuario = await new Promise((resolve, reject) => {
            req.body = {
                email: email,
                password: contrasenaTemporal,
                first_name: nombreDueno,
                last_name: '(Admin)',
                telefono: telefono,
                role: 'ADMIN_ROLE',
                numdoc: 'N/A'
            };

            // Interceptamos la respuesta JSON del controlador de usuarios
            res.json = function (datosUsuario) {
                resolve(datosUsuario);
            };

            // Interceptamos respuestas de error HTTP (ej: 400 por correo ya existente)
            res.status = function (codigo) {
                if (codigo >= 400) {
                    reject(new Error(`Fallo en controlador de usuarios con código ${codigo}`));
                }
                return res;
            };

            crearUsuarios(req, res).catch(reject);
        });

        // Restauramos las utilidades de respuesta de Express para el siguiente paso
        res.json = resOriginalJson;
        res.status = resOriginalStatus;

        if (!resultadoUsuario || !resultadoUsuario.ok || !resultadoUsuario.usuario) {
            return res.status(400).json({
                ok: false,
                msg: 'El usuario administrador no pudo ser registrado.',
                detalle: resultadoUsuario?.msg || 'Error desconocido.'
            });
        }

        // Guardamos el ID del usuario en memoria para habilitar el escudo de Rollback
        usuarioCreadoId = resultadoUsuario.usuario._id || resultadoUsuario.usuario.id;

        // ==========================================
        // PASO 2: CREAR LA TIENDA VINCULADA
        // ==========================================
        const resultadoTienda = await new Promise((resolve, reject) => {
            req.uid = usuarioCreadoId;
            req.body = {
                nombre: nombreLocal,
                telefono: telefono,
                usuario: usuarioCreadoId, // Capturado por duenoFinal de tu lógica
                // Bloques base requeridos por tu TiendaSchema para inicializar el Hero i18n
                texto_hero_uno: { es: `Bienvenidos a ${nombreLocal}`, en: '' },
                texto_hero_dos: { es: 'Catálogo Digital', en: '' },
                texto_hero_destacado: { es: 'Menú Completo', en: '' },
                descripcion_hero: { es: 'Explora nuestros platos y haz tu pedido en línea.', en: '' }
            };

            res.json = function (datosTienda) {
                resolve(datosTienda);
            };

            res.status = function (codigo) {
                if (codigo >= 400) {
                    reject(new Error(`Fallo en controlador de tiendas con código ${codigo}`));
                }
                return res;
            };

            crearTienda(req, res).catch(reject);
        });

        // Restauramos definitivamente las utilidades de respuesta nativas de Express
        res.json = resOriginalJson;
        res.status = resOriginalStatus;

        if (!resultadoTienda || !resultadoTienda.ok) {
            throw new Error('La tienda no pudo ser creada en la base de datos.');
        }

        // ==========================================
        // PASO 3: NOTIFICACIÓN EMAIL AL CLIENTE (Existente)
        // ==========================================
        try {
            const transporter = nodemailer.createTransport(smtpTransport({
                host: "zlipmenu.com",
                port: 465,
                secure: true,
                auth: {
                    user: process.env.USER_EMAIL,
                    pass: process.env.PASS_email
                },
                tls: { rejectUnauthorized: false }
            }));

            const mailOptions = {
                from: `"Soporte ZlipMenu" <${process.env.USER_EMAIL}>`,
                to: email,
                subject: `¡Tu catálogo digital ${nombreLocal} está listo! 🎉`,
                html: ` ... (tu HTML nativo de correo) ... `
            };

            transporter.sendMail(mailOptions).catch(errMail => {
                console.error('⚠️ Error asíncrono al enviar correo al cliente:', errMail.message);
            });
        } catch (emailSetupError) {
            console.error('⚠️ Error en la configuración de email:', emailSetupError.message);
        }

        // ==========================================
        // 🔥 PLAN DE RESPALDO: NOTIFICACIÓN WHATSAPP AUTOMÁTICA
        // ==========================================
        try {
            // Estructuramos un mensaje limpio y directo para el chat del cliente
            const mensajeWhatsApp =
                `¡Hola *${nombreDueno}*! 👋 Tu catálogo digital en *Zlipmenu* ya está activo.

                🏪 *Local:* ${nombreLocal}
                🔗 *Tu Link:* https://${slugDeseado}.zlipmenu.com

                🔐 *Credenciales de acceso a tu panel:*
                Panel: https://admin-zlipmenu.vercel.app/
                Usuario: ${email}
                Clave Temporal: \`${contrasenaTemporal}\`

                _(Te sugerimos cambiar tu contraseña al ingresar por primera vez)_`;

            // Invocamos tu función de whatsapp.js de manera asíncrona
            // (Pasamos el teléfono del lead guardado y el texto estructurado)
            enviarMensajeWhatsApp(telefono, mensajeWhatsApp).then(() => {
                console.log(`📱 Notificación de WhatsApp enviada con éxito a +${telefono}`);
            }).catch(errWS => {
                console.error('⚠️ Error asíncrono en canal de WhatsApp:', errWS.message);
            });

        } catch (whatsappSetupError) {
            console.error('⚠️ Error al inicializar el bloque de respaldo de WhatsApp:', whatsappSetupError.message);
        }

        // ==========================================
        // PASO 4: RESPUESTA EXITOSA CONSOLIDADA (Existente)
        // ==========================================
        return res.status(201).json({
            ok: true,
            msg: 'Estructura comercial configurada por completo. Canales de comunicación despachados.',
            tienda: resultadoTienda.tienda,
            usuario: resultadoUsuario.usuario,
            credenciales: {
                usuario: email,
                claveTemporal: contrasenaTemporal
            }
        });



    } catch (error) {
        console.error('❌ ALERTA: Error en el pipeline de automatización:', error.message);

        // 🛡️ MECANISMO DE ROLLBACK: Si el usuario llegó a crearse pero la tienda falló, lo eliminamos
        if (usuarioCreadoId) {
            console.log(`🛡️ Ejecutando Rollback: Eliminando usuario huérfano ID [${usuarioCreadoId}] de la base de datos...`);
            try {
                await Usuario.findByIdAndDelete(usuarioCreadoId);
                console.log('✅ Rollback completado con éxito. Base de datos purgada.');
            } catch (dbError) {
                console.error('🚨 Fallo crítico: No se pudo eliminar el usuario huérfano durante el rollback:', dbError.message);
            }
        }

        // Aseguramos restaurar los métodos nativos de Express ante el crash
        res.json = resOriginalJson;
        res.status = resOriginalStatus;

        return res.status(500).json({
            ok: false,
            msg: 'Fallo crítico sistémico al procesar la aprobación interna.',
            error: error.message
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
    registrarLocalAprobado
};
