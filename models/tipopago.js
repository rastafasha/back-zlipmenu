var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PaymentMethodSchema = Schema({
    tipo: { type: String, required: true },
    bankName: { type: String, required: false },
    bankAccountType: { type: String, required: false },
    bankAccount: { type: String, required: false },
    ciorif: { type: String, required: false },
    username: { type: String, required: false },
    phone: { type: String, required: false },
    email: { type: String, required: false },
    user: { type: Schema.ObjectId, ref: 'user' },
    local: { type: Schema.ObjectId, ref: 'tienda' , default: null},
    status: { type: String, required: true, default: 'INACTIVE' },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date }
});

module.exports = mongoose.model('paymentmethod', PaymentMethodSchema);