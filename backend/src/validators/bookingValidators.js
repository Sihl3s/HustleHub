/**
 * Booking input rules. The client only chooses which gig to book and may add
 * notes; price, freelancer and status are always decided by the server so they
 * cannot be tampered with in the request (OWASP, 2025a; OWASP, 2025c).
 */

const { body, param } = require('express-validator');

const BOOKING_FIELDS = ['gigId', 'notes'];

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
];

const bookingIdValidator = [param('id').isMongoId().withMessage('Invalid booking id')];

module.exports = { BOOKING_FIELDS, createBookingValidators, bookingIdValidator };
