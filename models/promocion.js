const { Schema, model } = require('mongoose');

const PromocionSchema = Schema({
    producto_title: {
        type: String,
        require: true
    },
    first_title: { type: String, required: true },
    etiqueta: { type: String, required: true },
    subtitulo: { type: String, required: true },
    colorfondo: { type: String, required: false },
    end: { type: String, required: true },
    enlace: { type: String, required: false },
    estado: { type: Boolean, required: false },
    img: { type: String, required: false },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true }
});

PromocionSchema.method('toJSON', function() {
    const { __v, ...object } = this.toObject();
    return object;
});

module.exports = model('promocion', PromocionSchema);