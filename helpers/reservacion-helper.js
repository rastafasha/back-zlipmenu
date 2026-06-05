const Reservacion = require('../models/reservacion');

/**
 * Verifica si una hora específica ya llegó al límite de comensales permitidos
 * @param {String} tiendaId - ID del restaurante
 * @param {String} fecha - Fecha a consultar (ej: '2026-06-04')
 * @param {String} hora - Hora a consultar (ej: '20:00')
 * @param {Number} limiteMaximo - Capacidad máxima por turno de la tienda
 */
const verificarCapacidadTurno = async (tiendaId, fecha, hora, limiteMaximo = 30) => {
    try {
        // Buscamos todas las reservas activas (no canceladas) para ese bloque exacto
        const reservasActuales = await Reservacion.find({
            local: tiendaId,
            fecha: fecha,
            hora: hora,
            status: { $ne: 'Cancelada' } // Excluimos las canceladas para liberar cupo
        });

        // Sumamos la cantidad de personas de todas las reservas de esa hora
        const totalComensales = reservasActuales.reduce((suma, res) => suma + (res.personas || 0), 0);

        // Si la suma supera o iguala el límite, el turno está lleno
        return {
            lleno: totalComensales >= limiteMaximo,
            disponibles: Math.max(0, limiteMaximo - totalComensales),
            totalActual: totalComensales
        };

    } catch (error) {
        console.error('Error calculando capacidad:', error);
        return { lleno: false, disponibles: 0, totalActual: 0 };
    }
};
module.exports = {
    verificarCapacidadTurno
};