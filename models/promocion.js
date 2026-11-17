const { Schema, model } = require('mongoose');

const PromocionSchema = Schema({
    producto_title: { type: String,require: true},
    first_title: { type: String, required: false },
    etiqueta: { type: String, required: false },
    subtitulo: { type: String, required: false },
    colorfondo: { type: String, required: false },
    end: { type: String, required: false },
    enlace: { type: String, required: false },
    estado: { type: Boolean, required: false },
    img: { type: String, required: false },
    local: { type: Schema.ObjectId, ref: 'tienda', default: null},
    tipo: {
        type: String,
        enum: ['DESING', 'IMAGEN'],
        default: 'DESING'
    },
    createdAt: { type: Date, default: Date.now, required: false },
    updatedAt: { type: Date, default: Date.now, required: false }
});

PromocionSchema.method('toJSON', function() {
    const { __v, ...object } = this.toObject();
    return object;
});

module.exports = model('promocion', PromocionSchema);