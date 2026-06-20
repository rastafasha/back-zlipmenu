var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PostalSchema = Schema({
    titulo: { type: String },
    precio: { type: String, required: true },
    distancia: { type: String, required: true },
    tiempo: { type: String, required: true },
    local: { type: Schema.ObjectId, ref: 'tienda' },
    createdAt: { type: Date, default: Date.now, required: true },
});

module.exports = mongoose.model('postal', PostalSchema);