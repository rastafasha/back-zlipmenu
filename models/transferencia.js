var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TransferenciaSchema = Schema({
    user: { type: Schema.ObjectId, ref: 'user' },
    metodo_pago: { type: Schema.ObjectId, ref: 'paymentmethod' },
    name_person: {type: String, required: false},
    phone: {type: String, required: false},
    amount: { type: String, required: true },
    tasa: { type: String, required: false },
    referencia: { type: String, required: true },
    bankName: { type: String, required: true },
    img: {type: String, required: false},
    observaciones: { type: String, required: false },
    pedido: { type: Schema.Types.ObjectId, ref: 'pedidomenu' },
    status: { type: String, required: true, default: 'pending' },
    local: { type: Schema.ObjectId, ref: 'tienda' , default: null},
    paymentday: { type: Date, default: Date.now, required: false },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date }
});

TransferenciaSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.updatedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('transferencia', TransferenciaSchema);
