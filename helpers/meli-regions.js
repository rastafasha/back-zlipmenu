const REGIONES_MERCADOLIBRE = {
    // Clave: Tu valor en base de datos (puedes ponerlo en mayúsculas para asegurar coincidencia)
    'VENEZUELA': {
        site_id: 'MLV',
        auth_domain: '://mercadolibre.com.ve'
    },
    'MEXICO': {
        site_id: 'MLM',
        auth_domain: '://mercadolibre.com.mx'
    },
    'COLOMBIA': {
        site_id: 'MCO',
        auth_domain: '://mercadolibre.com.co'
    },
    'ARGENTINA': {
        site_id: 'MLA',
        auth_domain: '://mercadolibre.com.ar'
    },
    'CHILE': {
        site_id: 'MLC',
        auth_domain: 'auth.mercadolibre.cl'
    }
};

/**
 * Deduce la configuración de Mercado Libre basándose en el string del país de la tienda
 * @param {String} paisNombre 
 */
function obtenerConfiguracionPorPais(paisNombre) {
    if (!paisNombre) return REGIONES_MERCADOLIBRE['VENEZUELA']; // Fallback por defecto
    
    const key = paisNombre.toUpperCase().trim();
    return REGIONES_MERCADOLIBRE[key] || REGIONES_MERCADOLIBRE['VENEZUELA'];
}

module.exports = { obtenerConfiguracionPorPais };