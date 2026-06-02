const { Schema, model } = require('mongoose');

const DriverProfileSchema = Schema({
    tipo_vehiculo: { type: String, require: true },
    placa: { type: String, require: true },
    color: { type: String, require: true, unique: true },
    modelo: { type: String, require: true },
    marca: { type: String, require: true },
    year: { type: String, require: true },
    licencianum: { type: String, require: true },
    img: { type: String, },
    status: { type: String, required: false, default: 'PENDING' },
    user: { type: Schema.ObjectId, ref: 'user', require: true  },
    asignaciones: { type: String, require: false, ref: 'asignardelivery' },
    // local: { type: Schema.ObjectId, ref: 'tienda', require: true  },
    // rutas: { type: String, require: true, default: 'USER' },
});


module.exports = model('driver', DriverProfileSchema);