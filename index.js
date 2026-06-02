// Load environment variables FIRST - before any other requires
require('dotenv').config();
const express = require('express');
const { dbConnection } = require('./database/config');
const cors = require('cors');
const path = require('path');
const socketIO = require('socket.io');

// Check if we're running on a serverless platform
const isServerless = process.env.RENDER === '1' || process.env.VERCEL === '1';
const isRender = process.env.RENDER === '1';

// Only require serverless-http if not on traditional server
let serverless;
if (!isServerless || isServerless && process.env.SERVERLESS) {
    serverless = require('serverless-http');
}

//notifications
const webpush = require('web-push');
const bodyParser = require('body-parser');

//crear server de express
const app = express();
const server = require('http').Server(app);

// Initialize socket.io with the server
// Direcciones estáticas permitidas (Locales y Paneles Administrativos fijos)
const allowedOrigins = [
    "http://localhost:4200",
    "https://localhost:4200",
    "http://localhost:4203",
    "http://localhost:4206",
    "http://localhost:4207",
    "http://localhost:3001",
    "https://menu-hamburguesa-tawny.vercel.app",
    "https://menu-panaderia.vercel.app",
    "https://menu-pizzeria-mauve.vercel.app",
    "https://adminstorenodejs.malcolmcordova.com",
    "https://admin.zlipmenu.com",
    "https://admin-zlipmenu.vercel.app", // admin en vercel
    "https://delivery-angular.vercel.app"
];

// Configuración compartida inteligente para SaaS Multi-Tenant
const corsOptions = {
    origin: (origin, callback) => {
        // 1. Permitir peticiones locales o sin origen (como Postman o apps móviles nativas)
        if (!origin) {
            return callback(null, true);
        }

        // 2. MAGIA DINÁMICA: Permitir CUALQUIER subdominio que termine en .zlipmenu.com
        // Esto valida http://zlipmenu.com, https://pizzeria.zlipmenu.com, etc.
        const esSubdominioZlipmenu = /\.zlipmenu\.com$/.test(origin) || origin === "https://zlipmenu.com" || origin === "http://zlipmenu.com";

        // 3. Validar si el origen es dinámico o si está en la lista de estáticos anteriores
        if (esSubdominioZlipmenu || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log(`[CORS RECHAZADO]: El origen ${origin} no tiene permisos.`);
            callback(new Error('Origin no permitido por CORS'));
        }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 204
};


// 1. Aplicar a las rutas normales de Express (REST API)

app.use(cors(corsOptions));

// 2. Aplicar a Socket.io
const io = socketIO(server, {
    cors: corsOptions
});

module.exports.io = io;

//lectura y parseo del body
app.use(express.json());

// Wrap everything in async function to properly await dbConnection
const startServer = async () => {
    //db
    await dbConnection();

    //directiorio publico de pruebas de google
    app.use(express.static('public'));

    //rutas
    app.use('/api/usuarios', require('./routes/usuarios'));
    app.use('/api/login', require('./routes/auth'));
    app.use('/api/todo', require('./routes/busquedas'));
    app.use('/api/uploads', require('./routes/uploads'));
    app.use('/api/blogs', require('./routes/blog'));
    app.use('/api/pages', require('./routes/page'));
    app.use('/api/sliders', require('./routes/slider'));

    //tienda
    app.use('/api/tiendas', require('./routes/tienda'));
    app.use('/api/marcas', require('./routes/marcas'));
    app.use('/api/categorias', require('./routes/categoria'));
    app.use('/api/cursos', require('./routes/curso'));
    app.use('/api/productos', require('./routes/producto'));
    app.use('/api/colors', require('./routes/color'));
    app.use('/api/selectors', require('./routes/selector'));
    app.use('/api/carritos', require('./routes/carrito'));
    app.use('/api/comentarios', require('./routes/comentario'));
    app.use('/api/comentariosapp', require('./routes/comentarioapp'));
    app.use('/api/congenerals', require('./routes/congeneral'));
    app.use('/api/contactos', require('./routes/contacto'));
    app.use('/api/cupons', require('./routes/cupon'));
    app.use('/api/direccions', require('./routes/direccion'));
    app.use('/api/galerias', require('./routes/galeria'));
    app.use('/api/galeriavideos', require('./routes/galeriavideo'));
    app.use('/api/ingresos', require('./routes/ingreso'));
    app.use('/api/postals', require('./routes/postal'));
    app.use('/api/tickets', require('./routes/ticket'));
    app.use('/api/ventas', require('./routes/venta'));
    app.use('/api/promocions', require('./routes/promocion'));
    app.use('/api/shippings', require('./routes/shipping'));
    app.use('/api/pickups', require('./routes/pickup'));
    app.use('/api/videocursos', require('./routes/videocurso'));
    app.use('/api/favoritos', require('./routes/favorito'));

    //pagos
    app.use('/api/tipopago', require('./routes/tipopago'));
    app.use('/api/transferencias', require('./routes/transferencia'));
    app.use('/api/pagoefectivo', require('./routes/pago.efectivo'));
    app.use('/api/pagocheque', require('./routes/pagocheque'));
    app.use('/api/paypal', require('./routes/paypal'));
    app.use('/api/tasadollarbcv', require('./routes/tasadollarbcv'));
    app.use('/api/tasaeurobcv', require('./routes/tasaeurobcv'));

    app.use('/api/paises', require('./routes/pais'));
    //delivery
    app.use('/api/driver', require('./routes/driver'));
    app.use('/api/asignardelivery', require('./routes/asignardelivery'));
    app.use('/api/pedidomenu', require('./routes/pedidomenu'));

    //notificacioens
    app.use('/api/notificaciones', require('./routes/notificaciones'));
    app.use('/api/notipush', require('./routes/notificaciones'));

    //notification
    const vapidKeys = {
        "publicKey": process.env.VAPI_KEY_PUBLIC,
        "privateKey": process.env.VAPI_KEY_PRIVATE
    };

    webpush.setVapidDetails(
        'mailto:example@youremail.com',
        vapidKeys.publicKey,
        vapidKeys.privateKey,
    );

    app.use(bodyParser.json());

    //test
    app.get("/", (req, res) => {
        res.json({ message: "Welcome to nodejs." });
    });

    //lo ultimo
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'public')); //ruta para produccion, evita perder la ruta
    });

    // Global error handling middleware
    app.use((err, req, res, next) => {
        console.error('Global error handler caught an error:', err);
        res.status(500).json({
            ok: false,
            msg: 'Internal Server Error',
            error: err.message || err.toString()
        });
    });

    // Solo iniciar servidor local si no estamos en Vercel
    // if (process.env.VERCEL !== '1') {
    //     server.listen(process.env.PORT, () => {
    //         console.log('Servidor en puerto: ' + process.env.PORT);
    //     });
    // }
};

// Start the server
startServer().catch(err => {
    console.error('Error starting server:', err);
    process.exit(1);
});

// For traditional server (including Render.com)
const PORT = process.env.PORT || 5000;

// Only start the HTTP server if not in serverless mode (Vercel)
// On Render, we need to start the server normally (not serverless)
// On Vercel, we export the handler for serverless
if (process.env.VERCEL !== '1') {
    server.listen(PORT, () => {
        console.log(`✅ Servidor ejecutándose en puerto: ${PORT}`);
        console.log(`🌐 Entorno: ${isRender ? 'Render.com' : 'Local/Production'}`);
    });
}

// Export for serverless platforms (Vercel)
if (typeof serverless !== 'undefined' && serverless) {
    module.exports.handler = serverless(app);
}

// Export app for testing and other uses
module.exports = { app, server, io };

