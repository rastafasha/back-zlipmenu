var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TiendaSchema = Schema({
    nombre: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    local: { type: String, required: true },
    moneda: { type: String, required: false },
    ciudad: { type: String, required: false },
    zip: { type: String, required: false },
    direccion: { type: String, required: false },
    telefono: { type: String, required: false },
    redssociales: { type: Array, required: false },
    img: { type: String, required: false },
    //hero section
    img_hero: { type: String, required: false },
    texto_hero_uno: { type: String, required: false },
    texto_hero_dos: { type: String, required: false },
    texto_hero_destacado: { type: String, required: false },
    descripcion_hero: { type: String, required: false },
    color_primario: { type: String, required: false, default: '#e74c3c' }, 
    color_fondo: { type: String, required: false },
    theme: { type: String, default: 'classic' },
    css_personalizado: { type: String, required: false, },
    //hero section
    status: { type: String, required: false, default: 'Desactivado' },
    subcategoria: { type: String, required: false },
    pais: { type: String, require: false, ref: 'pais' },
    categoria: { type: Schema.ObjectId, ref: 'categoria' },
    user: { type: Schema.ObjectId, ref: 'user' },
    productos: { type: Schema.ObjectId, ref: 'productos' },
    isFeatured: { type: Boolean, required: false },
    
    // 💳 Campos listos para el esquema de suscripción:
    plan: { type: String, required: false, default: 'Gratis' }, // 'Gratis', 'Premium', 'VIP'
    fechaVencimiento: { type: Date, required: false }, // Día exacto en que expira el acceso
    idSuscripcionPago: { type: String, required: false }, // Para guardar el ID de Stripe/PayPal en el futuro

    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date }
});

module.exports = mongoose.model('tienda', TiendaSchema);