var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var GaleriaVideoSchema = Schema({
    video: { type: String, required: true },
    titulo: { type: String, required: false },
    curso: { type: Schema.ObjectId, ref: 'curso' },
    status: { type: String, required: false, default: 'Desactivado' },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true }
});

module.exports = mongoose.model('galeriavideo', GaleriaVideoSchema);