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
    createdAt: { type: Date, default: Date.now, required: true },
});

module.exports = mongoose.model('venta', VentaSchema);