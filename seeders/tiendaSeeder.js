const mongoose = require('mongoose');
require('dotenv').config();

const { dbConnection } = require('../database/config');
const Tienda = require('../models/tienda');

const tiendasData = [
  {
    _id: new mongoose.Types.ObjectId('6734c094d85a59664c974822'),
    nombre: 'Web',
    // slug es requerido y unique en el modelo
    slug: 'web',
    local: 'web',
    telefono: '2342',
    redssociales: [],
    direccion: '<p>web</p>',
    pais: 'Venezuela',
    ciudad: 'caracas',
    zip: '1010a',
    state_banner: false, // no existe en el schema actual, pero se deja por si el backend lo tolera
    status: 'Activo',
    subcategoria: 'todas',
    isFeatured: false,
    createdAt: new Date('2024-11-13T15:07:00.303Z'),
    __v: 0,
  },
];

const seedTienda = async () => {
  try {
    await dbConnection();
    console.log('🌱 Iniciando seeder de tiendas...');

    // Limpiar tiendas existentes
    await Tienda.deleteMany({});
    console.log('✅ Tiendas existentes eliminadas');

    // Insertar tiendas
    await Tienda.insertMany(tiendasData);
    console.log(`✅ ${tiendasData.length} tiendas insertadas correctamente`);
    console.log(`   - ${tiendasData[0].nombre} (${tiendasData[0].slug})`);
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

seedTienda();

