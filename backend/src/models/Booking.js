/**
 * Booking collection. Schema is defined here so relationships are fixed for
 * the whole team; booking logic lives in the booking controller (Thami).
 */

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    gig: { type: mongoose.Schema.Types.ObjectId, ref: 'Gig', required: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'confirmed',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
