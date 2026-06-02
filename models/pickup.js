var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PickupSchema = Schema({
    nombreCompleto: { type: String, required: true },
    idNumber: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    user: { type: Schema.ObjectId, ref: 'user' },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date }
});

module.exports = mongoose.model('pickup', PickupSchema);