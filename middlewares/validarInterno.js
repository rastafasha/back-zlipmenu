const validarInterno = (req, res, next) => {
  try {
    // Extraer el token del header personalizado
    const tokenInterno = req.header('x-internal-token');

    // Verificar si el token existe y si coincide con el del entorno
    if (!tokenInterno || tokenInterno !== process.env.ZLIPMENU_INTERNAL_TOKEN) {
      return res.status(401).json({
        ok: false,
        msg: 'Acceso no autorizado. Token interno inválido o ausente.'
      });
    }

    next(); // El token es correcto, continuar al controlador
  } catch (error) {
    console.error('Error en middleware validarInterno:', error);
    return res.status(500).json({
      ok: false,
      msg: 'Error interno de validación.'
    });
  }
};

module.exports = {
  validarInterno
};