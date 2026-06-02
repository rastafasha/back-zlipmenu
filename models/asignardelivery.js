const { Schema, model } = require('mongoose');

const AsignarDeliverySchema = Schema({
   
    driver: {
        type: Schema.Types.ObjectId,
        ref: 'driver',
        require: true
    },
    venta: {
        type: Schema.Types.ObjectId,
        ref: 'venta',
        require: true
    },
    tienda: {
        type: Schema.Types.ObjectId,
        ref: 'tienda',
        require: true
    },
    driverPosition: { type: String, required: false, default: '0' },
    deliveryPosition: { type: String, required: false, default: '0' },
    status: { type: String, required: false, default: 'POR-ASIGNAR' },
    statusD: { type: String, required: false, default: 'POR-ASIGNAR' },
    statusC: { type: String, required: false, default: 'POR-ASIGNAR' },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date, default: Date.now, required: true }
});

AsignarDeliverySchema.method('toJSON', function() {
    const { __v, ...object } = this.toObject();
    return object;
});

module.exports = model('asignardelivery', AsignarDeliverySchema);