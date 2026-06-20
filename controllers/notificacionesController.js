const Notificacion = require('../models/notificacion');

const obtenerHistorial = async (req, res) => {
    const pagina = Number(req.query.page) || 1;
    const { localId, role } = req.query; // 💡 Sugerencia: Puedes pasar el rol desde Angular ('ADMIN', 'USER')
    const limite = 10;
    const skip = (pagina - 1) * limite;

    try {
        let query = {};

        // 🧠 CLAVE: Evaluamos por el rol del usuario que hace la petición
        // Si el rol es de cliente, filtramos obligatoriamente por SU id y el local
        if (role === 'CLIENTE' || role === 'USER') {
            
            // =========================================================================
            // 🛒 ESCENARIO CLIENTE: El cliente ve SU propio historial de esa tienda
            // =========================================================================
            if (!localId) {
                return res.status(400).json({ ok: false, msg: 'El ID del local es requerido para el cliente.' });
            }
            query = { 
                usuario: req.uid, 
                local: localId 
            };

        } else {
            // =========================================================================
            // 🏪 ESCENARIO DASHBOARD: El Administrador ve TODOS los pedidos de SU local
            // =========================================================================
            // 💡 REPARACIÓN CRÍTICA: Aquí usamos el localId obligatorio del restaurante, 
            // eliminando el filtro de 'usuario: req.uid' para poder ver las órdenes de todos los comensales.
            if (!localId) {
                return res.status(400).json({ ok: false, msg: 'El ID del local es obligatorio para el panel de administración.' });
            }
            
            query = { 
                local: localId 
            }; 
        }

        const [notificaciones, total] = await Promise.all([
            Notificacion.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limite)
                // .populate('usuario', 'first_name telefono') // Opcional: Por si quieres ver los datos del cliente en la lista
                ,
            Notificacion.countDocuments(query)
        ]);

        res.json({
            ok: true,
            notificaciones,
            proximo: (skip + limite < total) ? pagina + 1 : null
        });
    } catch (error) {
        console.error('Error al obtener historial segmentado:', error);
        res.status(500).json({ ok: false, msg: 'Error en el servidor' });
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
