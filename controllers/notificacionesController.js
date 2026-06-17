const Notificacion = require('../models/notificacion');

// GET: /api/notificaciones/historial
// controllers/notificaciones.js
const obtenerHistorial = async (req, res) => {
    const pagina = Number(req.query.page) || 1;
    const { localId } = req.query; // 🔑 Capturamos la tienda que está visitando desde Angular
    const limite = 10;
    const skip = (pagina - 1) * limite;

    try {
        let query = {};

        if (localId) {
            // =========================================================================
            // 🛒 ESCENARIO CLIENTE: El usuario está navegando dentro de una tienda específica
            // =========================================================================
            // Buscamos las notificaciones del cliente, pero enlazadas obligatoriamente a esa tienda.
            // Para que esto funcione, en tus controladores 'activar', 'finalizado' y 'update status'
            // debes asegurarte de guardar el 'local' (ej: local: pedido_data.tienda o transferencia.local)
            // en lugar de dejarlo en null.
            query = { 
                usuario: req.uid, 
                local: localId 
            };
        } else {
            // =========================================================================
            // 🏪 ESCENARIO DASHBOARD: Es el historial del local para sus administradores
            // =========================================================================
            // Si eres un admin en tu panel, necesitas ver todas las alertas del local sin importar el usuario.
            // (Este es el código que reparamos en 'crearPedidoMenu' y 'crearTransferencia')
            // Nota: Si manejas paneles administrativos donde el admin pasa su local, puedes ajustar
            // la lógica para que valide los roles, pero este es el comportamiento base ideal.
            query = { usuario: req.uid }; 
        }

        const [notificaciones, total] = await Promise.all([
            Notificacion.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limite),
            Notificacion.countDocuments(query)
        ]);

        res.json({
            ok: true,
            notificaciones,
            proximo: (skip + limite < total) ? pagina + 1 : null
        });
    } catch (error) {
        console.error('Error al obtener historial segmentado:', error);
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


// 🟢 BORRAR UNA NOTIFICACIÓN POR ID
const borrarNotificacionPorId = async (req, res) => {
    const id = req.params.id;
    const uid = req.uid; // ID del usuario autenticado vía JWT para seguridad

    try {
        const notificacion = await Notificacion.findById(id);

        if (!notificacion) {
            return res.status(404).json({
                ok: false,
                msg: 'Notificación no encontrada'
            });
        }

        // Seguridad: Verificar que la notificación de verdad le pertenezca a quien la intenta borrar
        if (notificacion.usuario.toString() !== uid) {
            return res.status(403).json({
                ok: false,
                msg: 'No tienes permisos para borrar esta notificación'
            });
        }

        await Notificacion.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'Notificación eliminada correctamente'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado... revisar logs'
        });
    }
};

// 🟢 BORRAR TODAS LAS NOTIFICACIONES DE UN USUARIO
const borrarTodasLasNotificaciones = async (req, res) => {
    const uid = req.uid; // El ID viene directo del token JWT

    try {
        // Borra masivamente solo las que le pertenecen al usuario autenticado
        await Notificacion.deleteMany({ usuario: uid });

        res.json({
            ok: true,
            msg: 'Todas las notificaciones han sido eliminadas'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado... revisar logs'
        });
    }
};




module.exports = {
    obtenerHistorial,
    obtenerContador,
    marcarTodasLeidas,
    marcarUnaLeida,
    borrarNotificacionPorId,
    borrarTodasLasNotificaciones
};
