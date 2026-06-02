var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PaymentMethodSchema = Schema({

    // Identificador público
    clientIdPaypal: { type: String, required: true },
    
    // ¡IMPORTANTE! El Secret Key es obligatorio para procesar pagos
    clientSecret: { type: String, required: true }, 

    email: { type: String, required: true },
    // 'sandbox' o 'live'
    mode: { type: String, enum: ['sandbox', 'live'], default: 'sandbox', required: true },
    local: { type: Schema.ObjectId, ref: 'tienda' , default: null},
    createdAt: { type: Date, default: Date.now},
    updatedAt: { type: Date }
});

module.exports = mongoose.model('paypal', PaymentMethodSchema);