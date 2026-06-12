const translate = require('google-translate-api-x');

/**
 * Traduce automáticamente cualquier texto de español a inglés
 * @param {string} text - Texto original en español (nombre, descripción, ingredientes)
 * @returns {Promise<string>} - Texto traducido al inglés
 */
async function translateToEnglish(text) {
  if (!text || text.trim() === '') return '';
  
  try {
    // google-translate-api-x es asíncrona y no requiere credenciales de pago
    const res = await translate(text, { from: 'es', to: 'en' });
    return res.text;
  } catch (error) {
    console.error('Error en el motor de traducción automática de Node.js:', error);
    // Salvavidas técnico: si la API falla o da timeout, retorna el texto original en español
    return text; 
  }
}

module.exports = { translateToEnglish };
