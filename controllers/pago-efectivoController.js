const { response } = require('express');
const mongoose = require('mongoose');
const PagoEfectivo = require('../models/pago.efectivo');

const getPagosEfectivo = async(req, res) => {

    const pagoefectivos = await PagoEfectivo.find().sort({ createdAt: -1 });

    res.json({
        ok: true,
        pagoefectivos
    });
};

const crearPagoEfectivo = async(req, res) => {
    
    const uid = req.uid;
    const pago_efectivo = new PagoEfectivo({
        // usuario: uid,
        ...req.body
    });

    try {

        const pagoEfectivoDB = await pago_efectivo.save();

        res.json({
            ok: true,
            pago_efectivo: pagoEfectivoDB
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }


};

const byTienda = async(req, res) => {
    const id = req.params.id;
    
    console.log('=== DEBUG byTienda ===');
    console.log('ID from params:', id, 'type:', typeof id, 'length:', id.length);
    console.log('isValid ObjectId:', mongoose.Types.ObjectId.isValid(id));
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        console.log('ID validation failed');
        return res.status(400).json({
            ok: false,
            msg: 'ID de tienda inválido'
        });
    }

    try {
        console.log('Executing query: { local: "' + id + '" }');
        
        // Test query to see all locals
        const allWithLocal = await PagoEfectivo.find({}).select('local _id').limit(5);
        console.log('Sample DB locals:', allWithLocal.map(p => ({ _id: p._id, local: p.local, localType: typeof p.local })));
        
        const data_efectivo = await PagoEfectivo.find({ local: id })
            .populate('local', 'nombre slug img')
            .sort({ createdAt: -1 });

        console.log('Query result count:', data_efectivo.length);
        console.log('First result local (if any):', data_efectivo[0]?.local?._id);

        if (data_efectivo.length === 0) {
            return res.json({
                ok: true,
                pagoefectivos: [],
                msg: 'No hay pagos en efectivo para esta tienda'
            });
        }

        res.json({
            ok: true,
            pagoefectivos: data_efectivo
        });
    } catch (err) {
        console.error('Error in byTienda:', err);
        res.status(500).json({
            ok: false,
            msg: 'Error del servidor'
        });
    }
};

module.exports = {
    getPagosEfectivo,
    crearPagoEfectivo,
    byTienda
}