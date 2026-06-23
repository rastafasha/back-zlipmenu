var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TiendaSchema = Schema({
    nombre: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    local: { type: String, required: true },
    
    // 🌍 MULTI-MONEDA GLOBAL: Lo dejamos como String libre para que acepte 'USD', 'EUR', 'ARS', 'CLP', 'UYU', 'EGP', etc.
    moneda: { type: String, required: true, default: 'USD' }, 
    
    // ⚙️ CONTROL DE FLUJO INTERNACIONAL: Define si el pedido va a WhatsApp o directo al POS de MongoDB
    tipoFlujo: { 
        type: String, 
        enum: ['WHATSAPP', 'POS_DIRECTO'], 
        default: 'WHATSAPP',
        required: true 
    },

    // 💳 FLEXIBILIDAD DE PAGOS: Switches para encender metodologías internacionales en el Checkout
    acepta_usd_internacional: { type: Boolean, default: false, required: true }, // Zelle / Swift
    acepta_eur: { type: Boolean, default: false, required: true },               // Bizum / SEPA Europa

    ciudad: { type: String, required: false },
    zip: { type: String, required: false },
    direccion: { type: String, required: false },
    direccion: { type: String, required: false },
    latitud: { type: String, required: false, default: '10.4880' },  // Coordenada base inicial
    longitud: { type: String, required: false, default: '-66.8580' },
    telefono: { type: String, required: false },
    redssociales: { type: Array, required: false },
    img: { type: String, required: false },
    
    //hero section
    img_hero: { type: String, required: false },
    
    // 🎯 INTERNACIONALIZADO: 
    texto_hero_uno: {
        es: { type: String, required: false }, 
        en: { type: String, default: '' }     
    },
    texto_hero_dos: {
        es: { type: String, required: false }, 
        en: { type: String, default: '' }     
    },
    texto_hero_destacado: {
        es: { type: String, required: false }, 
        en: { type: String, default: '' }     
    },
    descripcion_hero: {
        es: { type: String, required: false }, 
        en: { type: String, default: '' }     
    },
    
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
    has_cotizacion: { type: Boolean, required: true, default: false },
    has_reservacion: { type: Boolean, required: true, default: false },
    capacidad_por_hora:{type: Number, required: false },
    isFeatured: { type: Boolean, required: false },
    mostrarTasas: { type: Boolean, required: false },
    usaDelivery: { type: Boolean, required: false },
    
    // 💳 Campos listos para el esquema de suscripción:
    // beneficios pro: Reservaciones, Delivery con gps, app delivery
    plan: { type: String, required: false, default: 'Gratis' }, 
    planSuscripcion: {
        type: String,
        enum: ['BASICO', 'PRO', 'PREMIUM'],
        default: 'PRO' // Los dejas probar el PRO por una semana para que vean el GPS funcionando
    },
    planVence: {
        type: Date,
        // Multiplicamos 7 días * 24 horas * 60 minutos * 60 segundos * 1000 milisegundos
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
    },
    fechaVencimiento: { type: Date, required: false }, 
    idSuscripcionPago: { type: String, required: false }, 
    
    //registro para enviar notificaciones 
    whatsappStatus: { 
        type: String, 
        enum: ['CONECTADO', 'DESCONECTADO', 'ESPERANDO_QR'], 
        default: 'DESCONECTADO' 
    },
    whatsappQR: { type: String, default: '' }, 
    whatsappConnectedAt: { type: Date },

    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date }
});

module.exports = mongoose.model('tienda', TiendaSchema);
