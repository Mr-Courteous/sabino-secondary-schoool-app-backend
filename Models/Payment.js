// models/Payment.js
const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    method: {
        type: String,
        enum: ['cash', 'card', 'bank_transfer', 'mobile_money'],
        required: true
    },
    status: {
        type: String,
        enum: ['paid', 'unpaid', 'partial'],
        default: 'unpaid'
    },
    date: {
        type: Date,
        default: Date.now
    },
    reference: {
        type: String,
        unique: true,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Payment', PaymentSchema);
