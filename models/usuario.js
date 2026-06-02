const { Schema, model } = require('mongoose');

const UsuarioSchema = Schema({
    first_name: { type: String, required: true }, // El nombre que ingresa en el checkout
    last_name: { type: String, required: false }, // 👈 Cambiado a false para checkout rápido
    
    // 👈 IMPORTANTE: Si es express, no tenemos email. 
    // Para que Mongoose no choque con registros vacíos por el unique, 
    // usamos "sparse: true". Esto permite múltiples usuarios sin email.
    email: { type: String, required: false, unique: true, sparse: true }, 
    
    password: { type: String, required: false }, // 👈 Cambiado a false (le crearemos una aleatoria por detrás)
    
    img: { type: String },
    lang: { type: String },
    telefono: { type: String, required: true, unique: true }, // 👈 Ahora el teléfono es su llave de acceso única
    numdoc: { type: String },
    ciudad: { type: String, required: false },
    pais: { type: String, required: false, ref: 'PAIS' },
    role: { type: String, required: true, default: 'USER' },
    driver: { type: Schema.ObjectId, required: false, ref: 'driver' },
    local: { type: Schema.ObjectId, ref: 'tienda'},
    google: { type: Boolean, default: false },
    recovery_token: { type: String, default: null },
    recovery_expires: { type: Date, default: null }
});


UsuarioSchema.method('toJSON', function() { // modificar el _id a uid, esconde el password
    const { __v, _id, password, ...object } = this.toObject();
    object.uid = _id;
    return object;
});

module.exports = model('user', UsuarioSchema);