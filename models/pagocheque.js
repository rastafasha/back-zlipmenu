var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PagoChequeSchema = Schema({
    // user: { type: Schema.ObjectId, ref: 'user' },
    amount: { type: String, required: true },
    name_person: {type: String, required: true},
    ncheck: {type: String, required: true},
    phone: {type: String, required: true},
    status: { type: String, required: true, default: 'pending' },
    paymentday: { type: Date, default: Date.now, required: false },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date }
});

module.exports = mongoose.model('pagoecheque', PagoChequeSchema);