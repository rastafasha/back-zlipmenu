const { Schema, model } = require('mongoose');

const MarcaSchema = Schema({
    nombre: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    descripcion: { type: String, required: false },
    img: { type: String, required: false },
    producto: { type: Schema.ObjectId, ref: 'producto' },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true }
});

MarcaSchema.method('toJSON', function() {
    const { __v, ...object } = this.toObject();
    return object;
});

module.exports = model('marca', MarcaSchema);