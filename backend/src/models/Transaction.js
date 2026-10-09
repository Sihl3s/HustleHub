/**
 * Transaction collection. One transaction is created per booking and links the
 * client, freelancer, gig and booking together for income reporting.
 */

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    gig: { type: mongoose.Schema.Types.ObjectId, ref: 'Gig', required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['completed', 'refunded'], default: 'completed' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
