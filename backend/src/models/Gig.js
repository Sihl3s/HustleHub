/**
 * Gig collection. Every gig belongs to exactly one freelancer (`freelancer`),
 * which is the field ownership checks are made against.
 */

const mongoose = require('mongoose');

const gigSchema = new mongoose.Schema(
  {
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    category: { type: String, required: true, trim: true, maxlength: 50 },
    price: { type: Number, required: true, min: 1, max: 1000000 },
    deliveryDays: { type: Number, required: true, min: 1, max: 365 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Gig || mongoose.model('Gig', gigSchema);
