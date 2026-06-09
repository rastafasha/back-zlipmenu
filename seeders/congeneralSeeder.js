require('dotenv').config();

const { dbConnection } = require('../database/config');
const Congeneral = require('../models/congeneral');
const mongoose = require('mongoose');

const congeneralData = {
  _id: new mongoose.Types.ObjectId('67ac02f370caa7f3701984e9'),
  titulo: 'Zlipmenu',
  cr: 'Zlipmenu',
  telefono_uno: '3232',
  telefono_dos: '23',
  email_uno: 'mitienda@gmail.com',
  email_dos: 'contactomitienda@gmail.com',
  direccion: '<p>dasads</p>',
  horarios: 'todo el dia',
  iframe_mapa: 'dad',
  lang: 'en',
  modoPaypal: true,
  sandbox: 'ddas',
  clientePaypal: 'dasad',
  rapidapiKey: 'dasd',
  img: 'https://res.cloudinary.com/dmv6aukai/image/upload/v1758908532/mallConnect/uploads/congenerals/zo3ixclfoyzuurnwbvaa.svg',
  redessociales: [
    { title: 'whatsapp', url: '+584241874370', icono: 'fa fa-whatsapp' },
    { title: 'facebook', url: 'https://www.facebook.com/@mitienda', icono: 'fa fa-facebook' },
    { title: 'instagram', url: 'https://www.instagram.com/@malcolmcordova', icono: 'fa fa-instagram' },
  ],
};

const seedCongeneral = async () => {
  try {
    await dbConnection();
    console.log('🌱 Iniciando seeder de congenerals...');

    // Congeneral en este proyecto normalmente es 1 solo registro; usamos upsert por _id.
    await Congeneral.updateOne(
      { _id: congeneralData._id },
      { $set: congeneralData },
      { upsert: true }
    );

    console.log('✅ Congeneral insertado/actualizado correctamente');
  } catch (error) {
    console.error('❌ Error al ejecutar el seeder:', error);
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

seedCongeneral();

