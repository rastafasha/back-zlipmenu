const { response } = require('express');
const Usuario = require('../models/usuario');
const Direccion = require('../models/direccion');
const bcrypt = require('bcryptjs');
const { generarJWT } = require('../helpers/jwt');
const Tienda = require('../models/tienda');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');


const getUsuarios = async (req, res) => {

    const desde = Number(req.query.desde) || 0;

    const [usuarios, total] = await Promise.all([
        Usuario
            .find({}, 'first_name email role google img local') //esto ultimo filtra el resultado
            .skip(desde)
            .populate('first_name email role google img local')
            .sort({ createdAt: -1 }),
        // .limit(5),
        Usuario.countDocuments()

    ]);

    res.json({
        ok: true,
        usuarios,
        total,
        //uid: req.uid
    });
};

const getAllUsers = async (req, res) => {
    const desde = Number(req.query.desde) || 0;

    const usuarios = await Usuario.find()
        .skip(desde)
        // .limit(5)
        .populate('first_name email role google img local');
    Usuario.countDocuments()

    res.json({
        ok: true,
        usuarios
    });
};


const getTDrivers = async (req, res) => {

    const desde = Number(req.query.desde) || 0;
    const id = req.params.id;

    const drivers = await Usuario.find({ local: id })
        .where('role')
        .equals('CHOFER')
        .skip(desde)
        .limit(5)
        .populate('first_name email role google img local')

        .sort({ createdAt: -1 });
    // Usuario.countDocuments()

    res.json({
        ok: true,
        drivers,
        // total
    });
};

const getTDriversLocal = async (req, res) => {

    const local = req.params.local;
    const uid = req.uid;

    const drivers = await Usuario.find({ local: local, role: 'CHOFER' })
        .populate('first_name email role google img local')
        .sort({ createdAt: -1 });

    res.json({
        ok: true,
        drivers
    });

};

const getTClients = async (req, res) => {

    const desde = Number(req.query.desde) || 0;

    const clients = await Usuario.find()
        .where('role')
        .equals('USER')
        .skip(desde)
        .limit(5)
        .sort({ createdAt: -1 });
    Usuario.countDocuments()

    res.json({
        ok: true,
        clients,
        // total
    });
};

const getTiendaUsers = async (req, res) => {
    // 1. Obtenemos el parámetro de la ruta de forma segura
    const local = req.params.local;

    try {
        // 2. Usamos await en lugar de callbacks pasados por parámetro
        const tiendauserslocal = await Usuario.find({ local: local }).lean();

        // 3. Verificamos si encontramos usuarios
        if (tiendauserslocal && tiendauserslocal.length > 0) {
            return res.status(200).json({ usuarios: tiendauserslocal });
        } else {
            return res.status(404).json({ message: 'No se encontró ningún dato en esta sección.' });
        }

    } catch (error) {
        // 4. Cualquier error de Mongoose caerá aquí de forma segura sin tumbar el servidor
        console.error('Error en getTiendaUsers:', error);
        return res.status(500).json({ message: 'Ocurrió un error en el servidor.' });
    }
};


const getTiendaLocalEmployees = async (req, res) => {
    var local = req.params['local'];

    // Usar find() para obtener todos los usuarios asociados con el ID del local y los roles especificados
    Usuario.find({
        local: local,
        // role: { $in: ['TIENDA', 'ALMACEN', 'VENTAS'] } 
    }).exec((err, tiendauserslocal) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (tiendauserslocal && tiendauserslocal.length > 0) {
                res.status(200).send({ local: tiendauserslocal });
            } else {
                res.status(404).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });
};

const getAlmacenUsers = async (req, res) => {

    const desde = Number(req.query.desde) || 0;

    const almacenusers = await Usuario.find()
        .where('role')
        .equals('ALMACEN')
        .skip(desde)
        .limit(5)
        .sort({ createdAt: -1 });
    Usuario.countDocuments()

    res.json({
        ok: true,
        almacenusers
    });
};

const getUsuario = async (req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Usuario.findById(id)
        .populate('driver')
        .exec((err, usuario) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar usuario',
                    errors: err
                });
            }
            if (!usuario) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El usuario con el id ' + id + 'no existe',
                    errors: { message: 'No existe un usuario con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                usuario: usuario
            });
        });
};


const getUsuariobyCedula = async (req, res) => {


    var numdoc = req.params['numdoc'];

    Usuario.findOne({ numdoc: numdoc }).exec((err, numdoc_data) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (numdoc_data) {
                res.status(200).send({ numdoc: numdoc_data });
            } else {
                res.status(404).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });

};
const crearUsuarios = async (req, res = response) => {

    const { email, password } = req.body;

    const body = req.body;

     // 🔀 DESVÍO INTELIGENTE: Si no viene el correo, delegamos a la función Express
    if (!email || email.trim() === '') {
        console.log('📝 Cliente sin correo detectado. Derivando a crearClienteExpress...');
        return crearClienteExpress(req, res);
    }

    try {

        const existeEmail = await Usuario.findOne({ email });

        if (existeEmail) {
            return res.status(400).json({
                ok: false,
                msg: 'El correo ya está registrado'
            })
        }
        const usuario = new Usuario({
            first_name: body.first_name,
            last_name: body.last_name,
            telefono: body.telefono,
            local: body.local,
            numdoc: body.numdoc,
            email: body.email,
            role: body.role,
            img: 'default.png',
        });

        //encriptar password
        const salt = bcrypt.genSaltSync();
        usuario.password = bcrypt.hashSync(password, salt);

        //guardar usuario
        await usuario.save();

        // Notificar al admin por email
        // try {
        //     var transporter = nodemailer.createTransporter(smtpTransport({
        //        host: "zlipmenu.com",
        //         port: 465,
        //         secure: true,
        //         auth: {
        //             user: process.env.USER_EMAIL, // soporte@zlipmenu.com
        //             pass: process.env.PASS_email  // Tu contraseña real o de app
        //         },
        //         tls: {
        //             rejectUnauthorized: false
        //         }
        //     }));

        //     var mailOptions = {
        //         from: `"Soporte ZlipMenu" <${process.env.USER_EMAIL}>`, 
        //         to: 'mercadocreativo@gmail.com',
        //         subject: 'Nuevo usuario creado en Zlipmenu App',
        //         text: `Nuevo usuario registrado:
        //         Nombre: ${usuario.first_name} ${usuario.last_name || ''}
        //         Email: ${usuario.email}
        //         Teléfono: ${usuario.telefono || 'N/A'}
        //         Role: ${usuario.role}
        //         Local: ${usuario.local || 'N/A'}
        //         ID: ${usuario.id}`
        //     };

        //     transporter.sendMail(mailOptions, function (error, info) {
        //         if (error) {
        //             console.log('Error enviando email:', error);
        //         } else {
        //             console.log('Email enviado: ' + info.response);
        //         }
        //     });
        // } catch (emailError) {
        //     console.log('Error en notificación email:', emailError);
        // }

        //generar el token - JWT
        const token = await generarJWT(usuario.id);

        res.json({
            ok: true,
            usuario,
            token
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado... revisar logs'
        });
    }


};

const crearClienteExpress = async (req, res = response) => {
    // 1. Extraemos los campos del body
    const { first_name, telefono, local, direccion, referencia, nombres_completos, deliveryPosition } = req.body;

    try {
        if (!first_name || !telefono) {
            return res.status(400).json({
                ok: false,
                msg: 'El nombre y el teléfono son campos obligatorios.'
            });
        }

        // 2. Buscamos si ya existe el cliente por teléfono
        let usuario = await Usuario.findOne({ telefono });
        let esClienteNuevo = false;

        if (!usuario) {
            // 3. SI ES UN CLIENTE NUEVO: Autogeneramos credenciales en segundo plano
            esClienteNuevo = true;
            const salt = bcrypt.genSaltSync();
            const passwordTemporal = Math.random().toString(36).slice(-8); 
            const passwordEncriptada = bcrypt.hashSync(passwordTemporal, salt);

            const datosUsuario = {
                first_name,
                telefono,
                local,
                role: 'USER', 
                email: `express_${telefono}@zlipmenu.com`, 
                password: passwordEncriptada 
            };

            usuario = new Usuario(datosUsuario);
            // Guardamos el nuevo Usuario en MongoDB para obtener su usuario.id
            await usuario.save();
        }

        // 4. PROCESAR COORDENADAS (Válido para usuarios nuevos y existentes)
        let direccionGuardada = null;
        let lat = req.body.latitud;
        let lng = req.body.longitud;

        // Si las coordenadas vienen juntas en deliveryPosition, las separamos
        if (deliveryPosition && typeof deliveryPosition === 'string') {
            const coordenadas = deliveryPosition.split(',');
            if (coordenadas.length === 2) {
                lat = coordenadas[0].trim();
                lng = coordenadas[1].trim();
            }
        }

        // 5. 🛑 BLOQUEO DE DUPLICADOS: Solo guardamos si hay coordenadas reales y NO son '0,0'
        if (lat && lng && lat !== '0' && lng !== '0') {
            
            // 🧠 VALIDACIÓN EXTRA: Verificamos si este mismo usuario ya tiene exactamente esta latitud y longitud guardada
            const direccionExistente = await Direccion.findOne({ 
                user: usuario.id, 
                latitud: String(lat), 
                longitud: String(lng) 
            });

            if (!direccionExistente) {
                const nuevaDireccion = new Direccion({
                    nombres_completos: nombres_completos || first_name,
                    direccion: direccion || 'Dirección Express',
                    referencia: referencia || 'Sin referencia', 
                    latitud: String(lat),  
                    longitud: String(lng),
                    user: usuario.id,
                });

                // Guardamos la nueva ubicación en su colección correspondiente
                direccionGuardada = await nuevaDireccion.save();
                console.log(`📌 Nueva dirección creada con éxito para el usuario ${usuario.telefono}.`);
            } else {
                // Si ya existía la misma lat/lng, usamos el ID de la dirección que ya estaba en la base de datos
                direccionGuardada = direccionExistente;
                console.log(`🛑 Dirección idéntica detectada. No se duplicó en la base de datos.`);
            }
        }

        // 6. Generar su Token JWT de sesión
        const token = await generarJWT(usuario.id);

        // 7. Respuesta unificada (Agregamos return por seguridad de memoria)
        return res.json({
            ok: true,
            msg: esClienteNuevo 
                ? 'Nuevo cliente express y dirección creados exitosamente.' 
                : 'Cliente existente identificado correctamente.',
            usuario,
            // Devolvemos el ID real (ya sea el nuevo creado o el que ya existía en el sistema)
            direccionId: direccionGuardada ? direccionGuardada._id : null, 
            token
        });

    } catch (error) {
        console.log(error);
        // Colocamos return aquí para asegurar que Node.js libere la memoria ante un crash catastrófico
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado en checkout express... revisar logs'
        });
    }
};







const actualizarUAdmin = async (req, res = response) => {
    //todo: validar token y comprobar si el usuario es correcto

    const uid = req.params.id;

    try {
        const usuarioDB = await Usuario.findById(uid);
        if (!usuarioDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe el usuario por ese id'
            });
        }

        //actualizaciones
        const { password, google, email, ...campos } = req.body;


        if (usuarioDB.email !== email) {

            const existeEmail = await Usuario.findOne({ email });
            if (existeEmail) {
                return res.status(400).json({
                    ok: false,
                    msg: 'Ya existe un usuario con ese email'
                });
            }
        }

        if (!usuarioDB.google) {

            campos.email = email;

        } else if (usuarioDB.email !== email) {
            return res.status(400).json({
                ok: false,
                msg: 'Usuario de google no puede cambiar su correo'
            });
        }
        const usuarioActualizado = await Usuario.findByIdAndUpdate(uid, campos, { new: true });

        res.json({
            ok: true,
            usuario: usuarioActualizado
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado'
        });
    }
};

const actualizarUsuario = async (req, res = response) => {
    //todo: validar token y comprobar si el usuario es correcto

    // modificado por José Prados
    const uid = req.body.uid;
    // const uid = req.params.id;

    try {
        const usuarioDB = await Usuario.findById(uid);
        if (!usuarioDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe el usuario por ese id'
            });
        }

        //actualizaciones
        // const { password, google, email, ...campos } = req.body;
        const data = {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            local: req.body.local,
            role: req.body.role,
            pais: req.body.pais,
            ciudad: req.body.ciudad,
            lang: req.body.lang,
            telefono: req.body.telefono,
            numdoc: req.body.numdoc,
            email: req.body.email,
            google: req.body.google
        }
        // si en el req viene una password se agrega al objeto data para realizar el update
        if (req.body.password) {
            data.password = req.body.password;
        }
        // console.log('data: ',data)
        const email = data.email;

        if (usuarioDB.email !== data.email) {

            const existeEmail = await Usuario.findOne({ email: email });
            if (existeEmail) {
                return res.status(400).json({
                    ok: false,
                    msg: 'Ya existe un usuario con ese email'
                });
            }
        }

        if (!usuarioDB.google) {

            // campos.email = email;

        } else if (usuarioDB.email !== data.email) {
            return res.status(400).json({
                ok: false,
                msg: 'Usuario de google no puede cambiar su correo'
            });
        }

        // verificar si en el req hay una password
        if (req.body.password) {
            //encriptar password
            const salt = bcrypt.genSaltSync();
            data.password = bcrypt.hashSync(data.password, salt);
        }

        const usuarioActualizado = await Usuario.findByIdAndUpdate(uid, data, { new: true });

        res.json({
            ok: true,
            usuario: usuarioActualizado
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado'
        });
    }
};

const actualizarStatusUsuario = async (req, res = response) => {
    //todo: validar token y comprobar si el usuario es correcto

    const uid = req.params.id;

    try {
        const usuarioDB = await Usuario.findById(uid);
        if (!usuarioDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe el usuario por ese id'
            });
        }

        //actualizaciones
        const { password, google, email, ...campos } = req.body;

        if (usuarioDB.email !== email) {

            const existeEmail = await Usuario.findOne({ email });
            if (existeEmail) {
                return res.status(400).json({
                    ok: false,
                    msg: 'Ya existe un usuario con ese email'
                });
            }
        }

        if (!usuarioDB.google) {

            campos.email = email;

        } else if (usuarioDB.email !== email) {
            return res.status(400).json({
                ok: false,
                msg: 'Usuario de google no puede cambiar su correo'
            });
        }
        const usuarioActualizado = await Usuario.findByIdAndUpdate(uid, campos, { new: true });

        // Send welcome email if role changed
        if (campos.role && usuarioDB.role !== campos.role && usuarioActualizado.email) {
            const transporter = nodemailer.createTransport({
                host: "zlipmenu.com",
                port: 465,
                secure: true,
                auth: {
                    user: process.env.USER_EMAIL,
                    pass: process.env.PASS_email
                },
                tls: {
                    rejectUnauthorized: false
                }
            });


            const mailOptions = {
                from: `"Soporte ZlipMenu | CRM" <${process.env.USER_EMAIL}>`, 
                to: usuarioActualizado.email,
                subject: '¡Bienvenido! Tu rol ha sido actualizado',
                html: `
                    <h2>¡Hola, ${usuarioActualizado.username || 'Usuario'}!</h2>
                    <p>Tu rol ha sido actualizado a <strong>${usuarioActualizado.role}</strong>.</p>
                    <p>Ahora puedes acceder al sistema con tus nuevos permisos.</p>
                    <p>Puedes acceder a la aplicación por aquí: <a href="https://admin.zlipmenu.com/">https://admin.zlipmenu.com/</a>.</p>
                    <p>Si tienes alguna duda, contacta al administrador.</p>
                    <p>¡Gracias por usar Zlipmenu!</p>
                    <p>No Responda este correo</p>
                `
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending welcome email:', error);
                } else {
                    console.log('Welcome email sent to', usuarioActualizado.email, info.response);
                }
            });
        }

        res.json({
            ok: true,
            usuario: usuarioActualizado
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado'
        });
    }
};

const borrarUsuario = async (req, res) => {

    const uid = req.params.id;

    try {

        const usuarioDB = await Usuario.findById(uid);
        if (!usuarioDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe el usuario por ese id'
            });
        }

        await Usuario.findByIdAndDelete(uid);

        res.json({
            ok: true,
            msg: 'Usuario eliminado'
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado'
        });
    }
};

const set_token_recovery = (req, res) => {
    var email = req.params['email'];
    const token = Math.floor(Math.random() * (999999 - 100000) + 100000);


    var transporter = nodemailer.createTransport(smtpTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        auth: {
            user: 'mercadocreativo@gmail.com ',
            pass: 'pdnknnhpjijutcau'
        }
    }));

    var mailOptions = {
        from: 'mercadocreativo@gmail.com',
        to: email,
        subject: 'Código de recuperación.',
        text: 'Tu código de recuperacion es: ' + token
    };


    Usuario.findOne({ email: email }, (err, user) => {

        if (err) {
            res.status(500).send({ message: "Error en el servidor" });
        } else {
            if (user == null) {
                res.status(500).send({ message: "El correo electrónico no se encuentra registrado, intente nuevamente." });
            } else {
                Usuario.findByIdAndUpdate({ _id: user._id }, { recovery_token: token }, (err, user_update) => {
                    if (err) {

                    } else {
                        res.status(200).send({ data: user_update });

                        transporter.sendMail(mailOptions, function (error, info) {
                            if (error) {

                            } else {
                                console.log('Email sent: ' + info.response);
                            }
                        });
                    }
                })
            }
        }
    });
}

const verify_token_recovery = (req, res) => {
    var email = req.params['email'];
    var codigo = req.params['codigo'];

    Usuario.findOne({ email: email }, (err, user) => {
        if (err) {
            res.status(500).send({ message: "Error en el servidor" });
        } else {
            if (user.recovery_token == codigo) {
                res.status(200).send({ data: true });
            } else {
                res.status(200).send({ data: false });
            }
        }
    });
}

const change_password = (req, res) => {
    var email = req.params['email'];
    var params = req.body;
    Usuario.findOne({ email: email }, (err, user) => {
        if (err) {
            res.status(500).send({ message: "Error en el servidor" });
        } else {
            if (user == null) {
                res.status(500).send({ message: "El correo electrónico no se encuentra registrado, intente nuevamente." });
            } else {
                bcrypt.hash(params.password, null, null, function (err, hash) {
                    Usuario.findByIdAndUpdate({ _id: user._id }, { password: hash }, (err, user_update) => {
                        res.status(200).send({ data: user_update });
                    });
                });

            }
        }
    });
}


module.exports = {
    getUsuarios,
    crearUsuarios,
    actualizarUsuario,
    actualizarUAdmin,
    borrarUsuario,
    getUsuario,
    getAllUsers,
    set_token_recovery,
    verify_token_recovery,
    change_password,
    getTiendaUsers,
    getAlmacenUsers,
    getTDrivers,
    getTDriversLocal,
    getTClients,
    actualizarStatusUsuario,
    getUsuariobyCedula,
    crearClienteExpress,
    getTiendaLocalEmployees
};