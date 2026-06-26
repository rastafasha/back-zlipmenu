const { Schema, model } = require('mongoose');
'use strict'

const notificacionSchema = Schema({
    // Ahora es opcional. Si está presente, es una notificación para el cliente final.
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: false },
    
    // NUEVO: Si está presente, la notificación pertenece al historial operativo del local.
    local: { type: Schema.Types.ObjectId, ref: 'Local', required: false }, 
    
    titulo: { type: String, required: true }, 
    mensaje: { type: String, required: true }, 
    tipo: { 
        type: String, 
        enum: [
            'NUEVO_PAGO', 'PAGO_APROBADO', 'PAGO_RECHAZADO', 
            'NUEVO_PEDIDO', 'PEDIDO_APROBADO', 'PEDIDO_RECHAZADO',
            'PEDIDO_FINALIZADO', 'PEDIDO_ENVIADO',
            'RESERVACION_CONFIRMADA', 'RESERVACION_CANCELADA', 'RESERVACION_COMPLETADA',
            'NUEVA_RESERVACION', 'NUEVO_MENSAJE', 'AVISO_GENERAL','VENTA_FINALIZADA',
            'NUEVA_SOLICITUD', 'PRESUPUESTO_APROBADO', 'PRESUPUESTO_RECHAZADO', 'PRESUPUESTO_ACTUALIZADO',
        ],
        required: true 
    },
    // Si manejas lecturas individuales por empleado en el local, esto debería ser un array, 
    // pero si es general para el cliente o el local, un booleano simple basta.
    leido: { type: Boolean, default: false },
    referenciaId: { type: Schema.Types.ObjectId }, 
}, { timestamps: true });


module.exports = model('Notificacion', notificacionSchema);
