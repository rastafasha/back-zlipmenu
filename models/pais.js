var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PaisSchema = Schema({
    code: { type: String, required: true, unique: true },
    pais: { type: String, required: true },
    status: { type: String, required: false, default: 'Activo' },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date }
});

module.exports = mongoose.model('pais', PaisSchema);

