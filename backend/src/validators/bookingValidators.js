/**
 * Booking input rules. The client only chooses which gig to book, when they
 * would like the work done, and may add notes; price, freelancer and status are
 * always decided by the server so they cannot be tampered with in the request
 * (OWASP, 2025a; OWASP, 2025c).
 */

const { body, param } = require('express-validator');

const BOOKING_FIELDS = ['gigId', 'notes', 'requestedDate'];
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS_AHEAD = 365;

function startOfTodayUtc() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

const createBookingValidators = [
  body('gigId').isString().withMessage('gigId is required').bail().isMongoId().withMessage('Invalid gig id'),
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be text')
    .bail()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be 1000 characters or fewer')
    .escape(),
  body('requestedDate')
    .optional()
    .isISO8601({ strict: true })
    .withMessage('Requested date must be a valid date (YYYY-MM-DD)')
    .bail()
    .custom((value) => {
      const requested = Date.parse(value);
      // One day of slack so a client ahead of UTC can still pick "today".
      if (requested < startOfTodayUtc() - ONE_DAY_MS) {
        throw new Error('Requested date cannot be in the past');
      }
      if (requested > startOfTodayUtc() + MAX_DAYS_AHEAD * ONE_DAY_MS) {
        throw new Error('Requested date must be within the next year');
      }
      return true;
    })
    .toDate(),
];

const bookingIdValidator = [param('id').isMongoId().withMessage('Invalid booking id')];

module.exports = { BOOKING_FIELDS, createBookingValidators, bookingIdValidator };
