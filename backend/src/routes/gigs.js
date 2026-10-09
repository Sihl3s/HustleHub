/**
 * Gig routes. All require a valid JWT. Browsing is open to any authenticated
 * user; creating, updating and deleting is restricted to freelancers, and
 * the controller additionally checks that the gig belongs to the caller.
 */

const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');
const { rejectUnknownFields, validate } = require('../middleware/validate');
const {
  GIG_FIELDS,
  createGigValidators,
  updateGigValidators,
  gigIdValidator,
  listGigValidators,
} = require('../validators/gigValidators');
const gigController = require('../controllers/gigController');

const router = express.Router();

router.use(authenticate);

router.get('/', listGigValidators, validate, gigController.listGigs);
router.get('/mine', requireRole('freelancer'), gigController.listMyGigs);
router.get('/:id', gigIdValidator, validate, gigController.getGig);

router.post(
  '/',
  requireRole('freelancer'),
  rejectUnknownFields(GIG_FIELDS.filter((field) => field !== 'isActive')),
  createGigValidators,
  validate,
  gigController.createGig
);

router.put(
  '/:id',
  requireRole('freelancer'),
  gigIdValidator,
  rejectUnknownFields(GIG_FIELDS),
  updateGigValidators,
  validate,
  gigController.updateGig
);

router.delete(
  '/:id',
  requireRole('freelancer'),
  gigIdValidator,
  validate,
  gigController.deleteGig
);

module.exports = router;
