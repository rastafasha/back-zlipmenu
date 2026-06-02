require('dotenv').config();
const { dbConnection } = require('../database/config');
const Usuario = require('../models/usuario');
const bcryptjs = require('bcryptjs');

const SUPERADMIN_ID = '6509d14bb94908df43a2b5ef';
const EDITOR_ID = '69eaab0919ab9e7948b4bcc1';

const usuariosData = [
    {
        _id: SUPERADMIN_ID,
        first_name: 'Super',
        last_name: 'Admin',
        email: 'superadmin@superadmin.com',
        role: 'SUPERADMIN',
        google: false,
        password: 'password',
        numdoc: '3232',
        telefono: '04241874370',
        pais: 'Venezuela',
        lang: 'en',
        createdAt: new Date('2024-01-01T08:00:00Z'),
        updatedAt: new Date('2024-01-01T08:00:00Z')
    },
];

const seedUsuarios = async () => {
    try {
        await dbConnection();
        console.log('🌱 Iniciando seeder de usuarios...');

        // Limpiar usuarios existentes
        await Usuario.deleteMany({});
        console.log('✅ Usuarios existentes eliminados');

        // Hashear contraseñas e insertar usuarios
        const usuariosConHash = await Promise.all(
            usuariosData.map(async (usuario) => {
                const salt = bcryptjs.genSaltSync();
                usuario.password = bcryptjs.hashSync(usuario.password, salt);
                return usuario;
            })
        );

        await Usuario.insertMany(usuariosConHash);
        console.log(`✅ ${usuariosData.length} usuarios insertados correctamente`);
        console.log('   - superadmin@superadmin.com (SUPERADMIN)');
        console.log('   - admin@admin.com (ADMIN)');

    } catch (error) {
        console.error('❌ Error al ejecutar el seeder:', error);
        process.exit(1);
    } finally {
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        console.log('🔌 Conexión a MongoDB cerrada');
        process.exit(0);
    }
};

seedUsuarios();

