var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SolicitudPedidoSchema = Schema({
    // 🏢 La tienda/local que recibe la solicitud de banquete
    tienda: { type: Schema.ObjectId, ref: 'tienda', required: true },
    pedidoList: { type: Array, require: true },
    user: { type: Schema.ObjectId, ref: 'user' },
    status: { type: String, required: false, default: 'PENDING' },
    createdAt: { type: Date, default: Date.now, required: true },
}, { collection: 'solicitudPedido' });

module.exports = mongoose.model('SolicitudPedido', SolicitudPedidoSchema);

