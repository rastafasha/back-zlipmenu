'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PageSchema = Schema({
    titulo: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    img: { type: String, required: false },
    video_review: { type: String, required: false },
    descripcion: { type: String, required: true },
    origen: { type: String, required: true },
    categoria: { type: Schema.ObjectId, ref: 'categoria' },
    status: { type: String, required: false, default: 'Desactivado' },
    isFeatured: { type: Boolean, required: false },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true }
});

module.exports = mongoose.model('page', PageSchema);