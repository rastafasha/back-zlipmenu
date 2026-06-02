var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ComentarioappSchema = Schema({
    comentario: { type: String, required: true },
    pros: { type: String, required: true },
    cons: { type: String, required: true },
    estrellas: { type: Number, required: true },
    tienda: {
        type: Schema.Types.ObjectId,
        ref: 'tienda',
        require: true
    },
    user: { type: Schema.ObjectId, ref: 'user' },
    createdAt: { type: Date, default: Date.now, required: true },
});

module.exports = mongoose.model('comentarioapp', ComentarioappSchema);