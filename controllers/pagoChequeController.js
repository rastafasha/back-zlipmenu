const { response } = require('express');
const PagoCheque = require('../models/pagocheque');

const getPagosCheque = async(req, res) => {

    const pagoscheques = await PagoCheque.find().sort({ createdAt: -1 });

    res.json({
        ok: true,
        pagoscheques
    });
};

const crearPagoCheque = async(req, res) => {
    
    const uid = req.uid;
    const pago_cheque = new PagoCheque({
        usuario: uid,
        ...req.body
    });

    try {

        const pagoChequeDB = await pago_cheque.save();

        res.json({
            ok: true,
            pago_cheque: pagoChequeDB
        });

    } catch (error) {
        // console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }


};

const updateStatus = async(req, res) =>{
    const id = req.params.id;
    const uid = req.uid;

    try {

        const pago_cheque = await PagoCheque.findById(id);
        if (!pago_cheque) {
            return res.status(500).json({
                ok: false,
                msg: 'Pago Cheque no encontrado por el id'
            });
        }

        const cambiosPagoCheque = {
            ...req.body,
            usuario: uid
        }

        const pago_chequeActualizado = await PagoCheque.findByIdAndUpdate(id, cambiosPagoCheque, { new: true });

        res.json({
            ok: true,
            pago_chequeActualizado
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
}

module.exports = {
    getPagosCheque,
    crearPagoCheque,
    updateStatus
}