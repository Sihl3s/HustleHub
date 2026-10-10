/**
 * Booking routes. All require a valid JWT. Only clients can create bookings,
 * and booking creation is rate limited per account. Clients and freelancers
 * can list and view the bookings they are a party to.
 */

const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');
const { rejectUnknownFields, validate } = require('../middleware/validate');
const { bookingLimiter } = require('../middleware/rateLimiters');
const {
  BOOKING_FIELDS,
  createBookingValidators,
  bookingIdValidator,
} = require('../validators/bookingValidators');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  requireRole('client'),
  bookingLimiter,
  rejectUnknownFields(BOOKING_FIELDS),
  createBookingValidators,
  validate,
  bookingController.createBooking
);

router.get('/mine', requireRole('client', 'freelancer'), bookingController.listMyBookings);

router.get(
  '/:id',
  requireRole('client', 'freelancer'),
  bookingIdValidator,
  validate,
  bookingController.getBooking
);

module.exports = router;
