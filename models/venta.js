var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var VentaSchema = Schema({
    user: { type: Schema.ObjectId, ref: 'user' },
    local: { type: Schema.ObjectId, ref: 'tienda' },
    total_pagado: { type: Number, required: true },
    codigo_cupon: { type: String },
    info_cupon: { type: String },
    idtransaccion: { type: String },
    metodo_pago: { type: String, ref: 'paymentmethod' },
    pedido: { type: Schema.ObjectId, ref: 'pedidomenus' },

    tracking_number: { type: String },
    tipo_envio: { type: String, required: true },
    precio_envio: { type: String, required: true },
    tiempo_estimado: { type: String, required: true },

    direccion: { type: String, required: true },
    destinatario: { type: String, required: true },
    referencia: { type: String, required: true },
    pais: { type: String, required: true },
    ciudad: { type: String, required: true },
    zip: { type: String, required: true },

    month: { type: String },
    day: { type: String },
    year: { type: String },

    estado: { type: String, required: true },
    //mercadolibre
    origen: {
        type: String,
        enum: ['DIRECTA', 'MERCADOLIBRE'],
        default: 'DIRECTA'
    },
    meli_order_id: { type: String, default: null },
    meli_shipping_id: { type: String, default: null }, // Listo para cuando integres Mercado Envíos / Flex / Terceros
    
    createdAt: { type: Date, default: Date.now, required: true },
});

module.exports = mongoose.model('venta', VentaSchema);