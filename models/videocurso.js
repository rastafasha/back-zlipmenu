var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var VideocursoSchema = Schema({
    titulo: { type: String, required: true, unique: true },
    img: { type: String, required: false },
    urlYoutube: { type: String, required: false },
    urlVimeo: { type: String, required: false },
    fileVideo: { type: String, required: false },
    curso: { type: Schema.ObjectId, ref: 'curso' },
    status: { type: String, required: false, default: 'Desactivado' },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true }
});

module.exports = mongoose.model('videocurso', VideocursoSchema);