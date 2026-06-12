'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ProductoSchema = Schema({
    // 🎯 INTERNACIONALIZADO: El título del plato ahora es bilingüe
    titulo: {
        es: { type: String, required: true }, // "Hamburguesa con Queso"
        en: { type: String, default: '' }     // "Cheeseburger"
    },
    // El slug se mantiene como String plano único para las URLs amigables (ej: 'hamburguesa-con-queso')
    slug: { type: String, required: true, unique: true }, 
    img: { type: String, required: false },
    precio_ahora: { type: Number, required: true },
    precio_antes: { type: Number, required: true },
    video_review: { type: String, required: false },
    sku: { type: String, required: true },
    
    // 🎯 INTERNACIONALIZADO: Descripción corta (ingredientes o subtítulo)
    info_short: {
        es: { type: String, required: true }, // "Con papas fritas y aderezo de la casa"
        en: { type: String, default: '' }     // "With french fries and house dressing"
    },
    
    // 🎯 INTERNACIONALIZADO: Detalle extendido del plato
    detalle: {
        es: { type: String, required: true }, // "Carne de res de 200g, queso cheddar fundido..."
        en: { type: String, default: '' }     // "200g beef patty, melted cheddar cheese..."
    },
    
    stock: { type: Number, required: true },
    color: { type: Schema.ObjectId, ref: 'color', required: false },
    categoria: { type: Schema.ObjectId, ref: 'categoria' },
    selector: { type: Schema.ObjectId, ref: 'selector' },
    local: { type: Schema.ObjectId, ref: 'tienda' },
    subcategoria: { type: String, required: false },
    nombre_selector: { type: String, required: false },
    comentarios: { type: Schema.ObjectId, ref: 'comentario'  },
    ventas: { type: Number },
    isFeatured: { type: Boolean, required: false },
    status: { type: String, required: false, default: 'Desactivado' },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date }
});

module.exports = mongoose.model('producto', ProductoSchema);