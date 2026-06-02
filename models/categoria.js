var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CategoriaSchema = Schema({
    nombre: { type: String, required: true },
    icono: { type: String, required: true },
    subcategorias: { type: String, required: false },
    slug: { type: String, required: true, unique: false },
    img: { type: String },
    state_banner: { type: Boolean },
    status: { type: String, required: false, default: 'Desactivado' },
    local: { type: Schema.ObjectId, ref: 'tienda', required: true }, 
    productos: { type: Schema.ObjectId, ref: 'producto' },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date }
});

module.exports = mongoose.model('categoria', CategoriaSchema);