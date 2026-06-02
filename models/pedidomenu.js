const { Schema, model } = require('mongoose');

const PedidoMenuSchema = Schema({
   
   user: { type: Schema.ObjectId, ref: 'user', require: true  },
  
    pedidoList: { type: Array, require: true },
    delivery: { type: String, require: false },
    deliveryAddres: { type: String, require: false },
    tienda: {
        type: Schema.Types.ObjectId,
        ref: 'tienda',
        require: true
    },
    status: { type: String, required: false, default: 'PENDING' },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date }
}, { collection: 'pedidomenus' });

PedidoMenuSchema.method('toJSON', function() {
    const { __v, ...object } = this.toObject();
    return object;
});

module.exports = model('pedidomenu', PedidoMenuSchema);