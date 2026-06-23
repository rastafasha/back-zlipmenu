var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PresupuestoSchema = Schema({
    // 🏢 La tienda/local que recibe la solicitud de banquete
    tienda: { type: Schema.ObjectId, ref: 'tienda', required: true },
    
    // 👤 El cliente que solicita la cotización (usuario express o registrado)
    cliente: { type: Schema.ObjectId, ref: 'Usuario', required: true },
    
    // 🍕 Título descriptivo (Ej: "Banquete Corporativo Empresa X")
    title: { type: String, required: true },
    description: { type: String, required: true },
    observaciones: { type: String, required: false },
    
    // 📝 El desglose idéntico de platos de tu carrito tradicional
    pedidoList: { type: Array, required: true },
    
    // 💰 El monto financiero calculado de los platos seleccionados
    amount: { type: Number, required: true },
    status: { type: String, required: false, default: 'PENDING' },

    // =========================================================================
    // 👥 VARIABLES TIPO RESERVACIÓN (Las únicas dos adiciones que necesitas)
    // =========================================================================
    cantidadPersonas: { type: Number, required: true, default: 1 },
    fechaEvento: { type: Date, required: true },
    // =========================================================================

    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true }
}, { collection: 'presupuesto' });

module.exports = mongoose.model('Presupuesto', PresupuestoSchema);

