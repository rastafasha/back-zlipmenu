const { Schema, model } = require('mongoose');

const MeliOrdenSchema = Schema({
    tienda: { type: Schema.Types.ObjectId, ref: 'Tienda', required: true },
    meli_order_id: { type: String, required: true, unique: true },
    buyer_nickname: { type: String, default: 'Comprador Anónimo' },
    total_amount: { type: Number, required: true }, // Monto en USD o moneda local
    currency_id: { type: String, default: 'USD' },
    items_count: { type: Number, default: 1 },
    fecha: { type: Date, default: Date.now }, // Esencial para el eje X del gráfico
}, { timestamps: true });

module.exports = model('MeliOrden', MeliOrdenSchema);