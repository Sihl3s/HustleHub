/**
 * Bookings with simulated payment.
 *
 * The client and freelancer are always taken from the JWT and the stored gig,
 * and the price is copied from the gig in the database, so a client cannot
 * book on someone else's behalf or change what they pay. Every confirmed
 * booking produces exactly one Transaction record linking the client,
 * freelancer, gig and booking (OWASP, 2025a).
 */

const Booking = require('../models/Booking');
const Gig = require('../models/Gig');
const Transaction = require('../models/Transaction');
const { AppError } = require('../utils/appError');
const { logEvent } = require('../utils/logger');

const PARTY_FIELDS = 'fullName';

function refId(value) {
  return (value && value._id ? value._id : value).toString();
}

function toPublicParty(value) {
  if (value && value._id) {
    return { id: value._id.toString(), fullName: value.fullName };
  }
  return { id: refId(value) };
}

function confirmationReference(booking) {
  return `HH-${booking._id.toString().slice(-8).toUpperCase()}`;
}

function toPublicBooking(booking, transaction) {
  const gig = booking.gig && booking.gig._id
    ? { id: booking.gig._id.toString(), title: booking.gig.title, category: booking.gig.category }
    : { id: refId(booking.gig) };

  return {
    id: booking._id.toString(),
    confirmationReference: confirmationReference(booking),
    gig,
    client: toPublicParty(booking.client),
    freelancer: toPublicParty(booking.freelancer),
    price: booking.price,
    notes: booking.notes,
    status: booking.status,
    transaction: transaction
      ? { id: transaction._id.toString(), amount: transaction.amount, status: transaction.status }
      : undefined,
    createdAt: booking.createdAt,
  };
}

function populateBooking(query) {
  return query
    .populate('gig', 'title category')
    .populate('client', PARTY_FIELDS)
    .populate('freelancer', PARTY_FIELDS);
}

async function createBooking(req, res, next) {
  try {
    const { gigId, notes } = req.body;
    const gig = await Gig.findById(gigId);

    if (!gig || !gig.isActive) {
      throw new AppError('Gig not found', 404);
    }

    if (gig.freelancer.toString() === req.user.id) {
      throw new AppError('You cannot book your own gig', 400);
    }

    const booking = await Booking.create({
      gig: gig._id,
      client: req.user.id,
      freelancer: gig.freelancer,
      price: gig.price,
      notes: notes || '',
      status: 'confirmed',
    });

    let transaction;
    try {
      transaction = await Transaction.create({
        booking: booking._id,
        gig: gig._id,
        client: req.user.id,
        freelancer: gig.freelancer,
        amount: gig.price,
        status: 'completed',
      });
    } catch (err) {
      // Without a transaction the booking would be unpaid, so undo it.
      await Booking.deleteOne({ _id: booking._id });
      throw err;
    }

    const saved = await populateBooking(Booking.findById(booking._id));

    logEvent('info', 'booking_created', {
      userId: req.user.id,
      bookingId: booking.id,
      gigId: gig.id,
      transactionId: transaction.id,
    });

    return res.status(201).json({
      message: 'Booking confirmed. Payment was simulated and a transaction was recorded.',
      booking: toPublicBooking(saved, transaction),
    });
  } catch (err) {
    return next(err);
  }
}

/** Clients see bookings they made; freelancers see bookings on their gigs. */
async function listMyBookings(req, res, next) {
  try {
    const filter = req.user.role === 'freelancer'
      ? { freelancer: req.user.id }
      : { client: req.user.id };

    const bookings = await populateBooking(Booking.find(filter).sort({ createdAt: -1 }));
    const transactions = await Transaction.find({ booking: { $in: bookings.map((b) => b._id) } });
    const byBooking = new Map(transactions.map((t) => [t.booking.toString(), t]));

    return res.status(200).json({
      bookings: bookings.map((b) => toPublicBooking(b, byBooking.get(b._id.toString()))),
    });
  } catch (err) {
    return next(err);
  }
}

/** Only the client or freelancer on the booking may view it. */
async function getBooking(req, res, next) {
  try {
    const booking = await populateBooking(Booking.findById(req.params.id));

    const isParty = booking
      && (refId(booking.client) === req.user.id || refId(booking.freelancer) === req.user.id);

    if (!isParty) {
      if (booking) {
        logEvent('info', 'booking_access_denied', { userId: req.user.id, bookingId: req.params.id });
      }
      // 404 rather than 403 so other users cannot discover which ids exist.
      throw new AppError('Booking not found', 404);
    }

    const transaction = await Transaction.findOne({ booking: booking._id });
    return res.status(200).json({ booking: toPublicBooking(booking, transaction) });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createBooking, listMyBookings, getBooking };
