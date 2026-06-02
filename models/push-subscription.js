// models/push-subscription.js
const { Schema, model } = require('mongoose');

const pushSchema = Schema({
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    subscription: {
        endpoint: { type: String, required: true },
        expirationTime: { type: Number, default: null },
        keys: {
            p256dh: { type: String, required: true },
            auth: { type: String, required: true }
        }
    },
    dispositivo: { type: String } // Opcional: 'Chrome-Mac', 'PWA-Android'
}, { timestamps: true });

module.exports = model('PushSubscription', pushSchema);
