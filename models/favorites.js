'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var FavoritoSchema = Schema({
    // status: { type: String, required: false, default: 'Desactivado' },
    producto: { type: Schema.ObjectId, ref: 'producto' },
    usuario: { type: Schema.ObjectId, ref: 'user' },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date }
});

module.exports = mongoose.model('favorito', FavoritoSchema);