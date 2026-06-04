const mongoose = require('mongoose');
const Schema = mongoose.Schema;


var ReservaSchema = Schema({
    fecha: { type: Date, required: true },
    personas: { type: Number, required: true, min: 1 }, // Cambiado a Number para poder calcular capacidades
    hora: { type: String, required: true }, // Se requiere la hora para apartar la mesa
    listaespera: { type: Boolean, required: true, default: false },
    
    // Datos del Cliente
    first_name: { type: String, required: true }, // Lo ideal es que el nombre sea obligatorio
    last_name: { type: String, required: true },
    email: { type: String, required: true },
    telefono: { type: String, required: true },
    
    // Alergias y Notas (Cambiados a required: false)
    comensal_alergia: { type: String, required: false, default: 'No' }, // 'Sí' o 'No'
    comentarios_alergia: { type: String, required: false }, // Solo si aplica
    comentarios: { type: String, required: false }, // Notas adicionales del cliente
    
    
    // Estado de la reserva
    // Sugerencia: Usa estados reales de reservas como 'Pendiente', 'Confirmada', 'Cancelada', 'Completada'
    status: { 
        type: String, 
        required: true, 
        enum: ['Pendiente', 'Confirmada', 'Cancelada', 'Completada'], 
        default: 'Pendiente' 
    },
    observaciones: { type: String, required: false }, // en caso de que sea rechazado
    
    // Relación con tu modelo Tienda (usando la referencia 'tienda' de tu archivo anterior)
    usuario: { type: Schema.ObjectId, ref: 'usuario', required: true }, 
    local: { type: Schema.ObjectId, ref: 'tienda', required: true }, 
    
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true }
});

module.exports = mongoose.model('reserva', ReservaSchema);
