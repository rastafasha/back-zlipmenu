const Notificacion = require('../models/notificacion');

// GET: /api/notificaciones/historial
// controllers/notificaciones.js
const obtenerHistorial = async (req, res) => {
    const pagina = Number(req.query.page) || 1; // Recibimos página 1, 2, 3...
    const limite = 10;
    const skip = (pagina - 1) * limite; // Si es pág 2, salta 10

    try {
        const [notificaciones, total] = await Promise.all([
            Notificacion.find({ usuario: req.uid })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limite),
            Notificacion.countDocuments({ usuario: req.uid })
        ]);

        res.json({ 
            ok: true, 
            notificaciones,
            proximo: (skip + limite < total) ? pagina + 1 : null 
        });
    } catch (error) {
        res.status(500).json({ ok: false });
    }
};


// GET: /api/notificaciones/unread-count
const obtenerContador = async (req, res) => {
    try {
        const count = await Notificacion.countDocuments({ usuario: req.uid, leido: false });
        res.json({ ok: true, count });
    } catch (error) {
        res.status(500).json({ ok: false, count: 0 });
    }
};

// PUT: /api/notificaciones/marcar-leidas (TODAS)
const marcarTodasLeidas = async (req, res) => {
    try {
        await Notificacion.updateMany({ usuario: req.uid, leido: false }, { leido: true });
        res.json({ ok: true, msg: 'Notificaciones limpias' });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al actualizar' });
    }
};

// PUT: /api/notificaciones/:id (UNA SOLA - Para el Offcanvas)
const marcarUnaLeida = async (req, res) => {
    try {
        const id = req.params.id;
        const notif = await Notificacion.findOneAndUpdate(
            { _id: id, usuario: req.uid }, 
            { leido: true }, 
            { new: true }
        );
        if (!notif) return res.status(404).json({ ok: false, msg: 'No encontrada' });
        res.json({ ok: true, notif });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al actualizar' });
    }
};

module.exports = {
    obtenerHistorial,
    obtenerContador,
    marcarTodasLeidas,
    marcarUnaLeida
};
