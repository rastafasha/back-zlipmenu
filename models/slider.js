const { Schema, model } = require('mongoose');

const SliderSchema = Schema({

    first_title: { type: String, required: false },
    subtitulo: { type: String, required: false },
    enlace: { type: String, required: false },
    target: { type: String, required: false },
    status: { type: String, required: false },
    mostrarInfo: { type: Boolean, required: true },
    mostrarboton: { type: Boolean, required: true },
    align: { type: String, required: false},
    color: { type: String, required: false},
    img: { type: String, required: false },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true }
});

SliderSchema.method('toJSON', function() {
    const { __v, ...object } = this.toObject();
    return object;
});

module.exports = model('slider', SliderSchema);