var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var DireccionSchema = Schema({
    nombres_completos: { type: String, required: false },
    direccion: { type: String, required: false },
    referencia: { type: String, required: true },
    pais: { type: String, required: false },
    ciudad: { type: String, required: false },
    zip: { type: String, required: false },
    latitud: { type: String, required: true },
    longitud: { type: String, required: true },
    user: { type: Schema.ObjectId, ref: 'user' },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date }
});

module.exports = mongoose.model('direccion', DireccionSchema);