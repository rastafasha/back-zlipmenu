var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ShippingSchema = Schema({
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    idnumber: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    direccion: { type: String, required: true },
    referencia: { type: String, required: true },
    postal: { type: Schema.ObjectId, ref: 'postal', required: true },
    pagoTd: { type: String, required: true },
    pagoEfectivo: { type: String, required: true },
    factura: { type: String, required: true },
    user: { type: Schema.ObjectId, ref: 'user' },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date }
});

module.exports = mongoose.model('shipping', ShippingSchema);