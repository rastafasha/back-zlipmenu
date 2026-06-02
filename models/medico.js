const { Schema, model } = require('mongoose');

const MedicoSchema = Schema({
    nombre: {
        type: String,
        require: true
    },
    img: {
        type: String,
    },
    usuario: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        require: true
    },
    hospital: {
        type: Schema.Types.ObjectId,
        ref: 'Hospital',
        require: true
    }
});

MedicoSchema.method('toJSON', function() {
    const { __v, ...object } = this.toObject();
    return object;
});

module.exports = model('Medico', MedicoSchema);