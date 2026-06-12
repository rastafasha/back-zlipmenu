var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CategoriaSchema = Schema({
    // 🎯 INTERNACIONALIZADO: El nombre de la sección ahora es bilingüe
    nombre: {
        es: { type: String, required: true }, // "Pizzas", "Entradas"
        en: { type: String, default: '' }     // "Pizzas", "Appetizers"
    },
    icono: { type: String, required: true },
    subcategoria: {
        es: { type: String, required: false },
        en: { type: String, required: false }
    },
    // El slug se queda plano para conservar tus rutas amigables en las búsquedas
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