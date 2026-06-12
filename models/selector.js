var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const SelectorSchema = Schema({
    // Transformamos 'titulo' en un objeto para soportar los idiomas (es, en, etc.)
    titulo: {
        es: { type: String, required: true },
        en: { type: String, required: false } // O true, según tu regla de negocio
    },
    estado: { type: String, required: false },
    producto: { type: Schema.ObjectId, ref: 'producto' },
    createdAt: { type: Date, default: Date.now, required: true },
});
module.exports = mongoose.model('selector', SelectorSchema);