'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var MercadoLibreConfigSchema = Schema({
    // 🏢 Relación con la tienda dueña de la integración
    tienda: { type: Schema.ObjectId, ref: 'tienda', required: true, unique: true },
    
    // ⚙️ DATOS DE LA APP PROPIA DEL CLIENTE (Sustituyen al .env)
    client_id: { type: String, required: true },
    client_secret: { type: String, required: true },
    redirect_uri: { type: String, required: true }, // La URL de redirección que configuró este cliente en su app
    
    // 🔐 TOKENS DINÁMICOS DE ACCESO
    access_token: { type: String, default: null },
    refresh_token: { type: String, default: null },
    expires_at: { type: Date, default: null }, 
    
    // 👤 Datos del perfil del vendedor en Mercado Libre
    mel_user_id: { type: String, default: null }, 
    nickname: { type: String, default: null },                    
    
    status: { type: String, enum: ['CONFIGURADO', 'CONECTADO', 'DESCONECTADO'], default: 'CONFIGURADO' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date }
});

module.exports = mongoose.model('mercadolibre_config', MercadoLibreConfigSchema);
