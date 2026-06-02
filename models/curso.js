'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CursoSchema = Schema({
    titulo: { type: String, required: true, unique: true },
    img: { type: String, required: false },
    precio_ahora: { type: Number, required: true },
    precio_antes: { type: Number, required: true },
    video_review: { type: String, required: false },
    info_short: { type: String, required: true },
    detalle: { type: String, required: true },
    categoria: { type: Schema.ObjectId, ref: 'categoria' },
    videos: { type: Schema.ObjectId, ref: 'videocurso' },
    ventas: { type: Number },
    status: { type: String, required: false, default: 'Desactivado' },
    isFeatured: { type: Boolean, required: false },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true }
});

module.exports = mongoose.model('curso', CursoSchema);