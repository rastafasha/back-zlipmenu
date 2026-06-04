require('dotenv').config();

const mongoose = require('mongoose');
const { dbConnection } = require('../database/config');
const Reservacion = require('../models/reservacion');
const Usuario = require('../models/usuario');
const Tienda = require('../models/tienda');

// IDs usados en los seeders existentes
const CLIENTE_ID = '6a20361266ad5f24033983f6';
const TIENDA_WEB_ID = '6a202c003588eac4ceea1514';

const reservasData = [
  {
    fecha: new Date('2024-11-20T00:00:00.000Z'),
    personas: 2,
    hora: '19:30',
    listaespera: false,

    first_name: 'Juan',
    last_name: 'Pérez',
    email: 'juan.perez@example.com',
    telefono: '04129528800',

    comensal_alergia: 'No',
    comentarios_alergia: '',
    comentarios: 'Cumpleaños. Mesa tranquila si es posible.',

    status: 'Confirmada',

    usuario: new mongoose.Types.ObjectId(CLIENTE_ID),
    local: new mongoose.Types.ObjectId(TIENDA_WEB_ID),

    createdAt: new Date('2024-11-01T10:00:00.000Z'),
    updatedAt: new Date('2024-11-01T10:00:00.000Z'),
  },
  {
    fecha: new Date('2024-11-20T00:00:00.000Z'),
    personas: 4,
    hora: '20:00',
    listaespera: true,

    first_name: 'María',
    last_name: 'Gómez',
    email: 'maria.gomez@example.com',
    telefono: '04121111111',

    comensal_alergia: 'Sí',
    comentarios_alergia: 'Alergia a frutos secos',
    comentarios: 'Necesitan silla para niño.',

    status: 'Pendiente',

    usuario: new mongoose.Types.ObjectId(CLIENTE_ID),
    local: new mongoose.Types.ObjectId(TIENDA_WEB_ID),

    createdAt: new Date('2024-11-02T12:00:00.000Z'),
    updatedAt: new Date('2024-11-02T12:00:00.000Z'),
  },
  {
    fecha: new Date('2024-11-22T00:00:00.000Z'),
    personas: 1,
    hora: '18:45',
    listaespera: false,

    first_name: 'Luis',
    last_name: 'Torres',
    email: 'luis.torres@example.com',
    telefono: '04123333333',

    comensal_alergia: 'No',
    comentarios_alergia: '',
    comentarios: 'Pago en efectivo.',

    status: 'Cancelada',

    usuario: new mongoose.Types.ObjectId(CLIENTE_ID),
    local: new mongoose.Types.ObjectId(TIENDA_WEB_ID),

    createdAt: new Date('2024-11-05T09:15:00.000Z'),
    updatedAt: new Date('2024-11-06T09:15:00.000Z'),
  },
  {
    fecha: new Date('2024-11-23T00:00:00.000Z'),
    personas: 3,
    hora: '21:00',
    listaespera: false,

    first_name: 'Andrea',
    last_name: 'Rivas',
    email: 'andrea.rivas@example.com',
    telefono: '04124444444',

    comensal_alergia: 'No',
    comentarios_alergia: '',
    comentarios: 'Preferencia por mesa cerca de la ventana.',

    status: 'Completada',

    usuario: new mongoose.Types.ObjectId(CLIENTE_ID),
    local: new mongoose.Types.ObjectId(TIENDA_WEB_ID),

    createdAt: new Date('2024-11-07T16:10:00.000Z'),
    updatedAt: new Date('2024-11-08T16:10:00.000Z'),
  },
];

const seedReservaciones = async () => {
  try {
    await dbConnection();

    console.log('🌱 Iniciando seeder de reservaciones...');

    // Validar referencias (si no existen, abortamos para no romper el seed)
    const [usuario, tienda] = await Promise.all([
      Usuario.findById(CLIENTE_ID).lean(),
      Tienda.findById(TIENDA_WEB_ID).lean(),
    ]);

    if (!usuario) {
      console.error(`❌ No existe el usuario con _id=${CLIENTE_ID}. Ejecuta usuarioSeeder primero.`);
      process.exit(1);
    }

    if (!tienda) {
      console.error(`❌ No existe la tienda con _id=${TIENDA_WEB_ID}. Ejecuta tiendaSeeder primero.`);
      process.exit(1);
    }

    await Reservacion.deleteMany({});
    console.log('✅ Reservaciones existentes eliminadas');

    await Reservacion.insertMany(reservasData);
    console.log(`✅ ${reservasData.length} reservaciones insertadas correctamente`);
    console.log(`   - Ejemplo: ${reservasData[0].first_name} (${reservasData[0].status})`);
  } catch (error) {
    console.error('❌ Error al ejecutar el seeder de reservaciones:', error);
    process.exit(1);
  } finally {
    try {
      await mongoose.connection.close();
      console.log('🔌 Conexión a MongoDB cerrada');
    } catch (e) {
      // ignore
    }
    process.exit(0);
  }
};

seedReservaciones();

