/**
 * Gig CRUD.
 *
 * Ownership is enforced server-side: the owner is always taken from the JWT
 * (req.user.id), never from the request body, and update/delete verify that the
 * stored gig belongs to the caller (OWASP, 2025a).
 */

const Gig = require('../models/Gig');
const { AppError } = require('../utils/appError');
const { logEvent } = require('../utils/logger');
const { GIG_FIELDS } = require('../validators/gigValidators');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toPublicGig(gig) {
  const owner = gig.freelancer && gig.freelancer._id ? gig.freelancer : null;

  return {
    id: gig._id.toString(),
    title: gig.title,
    description: gig.description,
    category: gig.category,
    price: gig.price,
    deliveryDays: gig.deliveryDays,
    isActive: gig.isActive,
    freelancer: owner
      ? { id: owner._id.toString(), fullName: owner.fullName }
      : { id: gig.freelancer.toString() },
    createdAt: gig.createdAt,
    updatedAt: gig.updatedAt,
  };
}

function ownerId(gig) {
  return (gig.freelancer._id || gig.freelancer).toString();
}

/** Loads a gig or throws 404. */
async function loadGig(id) {
  const gig = await Gig.findById(id).populate('freelancer', 'fullName');
  if (!gig) {
    throw new AppError('Gig not found', 404);
  }
  return gig;
}

/** Loads a gig and throws 403 unless the caller owns it. */
async function loadOwnedGig(req) {
  const gig = await loadGig(req.params.id);
  if (ownerId(gig) !== req.user.id) {
    logEvent('info', 'gig_ownership_denied', { userId: req.user.id, gigId: req.params.id });
    throw new AppError('You can only modify your own gigs', 403);
  }
  return gig;
}

async function createGig(req, res, next) {
  try {
    const { title, description, category, price, deliveryDays } = req.body;
    const created = await Gig.create({
      freelancer: req.user.id,
      title,
      description,
      category,
      price,
      deliveryDays,
    });
    const gig = await loadGig(created.id);

    logEvent('info', 'gig_created', { userId: req.user.id, gigId: created.id });
    return res.status(201).json({ message: 'Gig created', gig: toPublicGig(gig) });
  } catch (err) {
    return next(err);
  }
}

/** Browse: active gigs from all freelancers, with optional filtering. */
async function listGigs(req, res, next) {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const filter = { isActive: true };

    if (typeof req.query.category === 'string' && req.query.category) {
      filter.category = new RegExp(`^${escapeRegex(req.query.category)}$`, 'i');
    }
    if (typeof req.query.search === 'string' && req.query.search) {
      const pattern = new RegExp(escapeRegex(req.query.search), 'i');
      filter.$or = [{ title: pattern }, { description: pattern }];
    }

    const [gigs, total] = await Promise.all([
      Gig.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('freelancer', 'fullName'),
      Gig.countDocuments(filter),
    ]);

    return res.status(200).json({ gigs: gigs.map(toPublicGig), page, limit, total });
  } catch (err) {
    return next(err);
  }
}

/** A freelancer's own gigs, including inactive ones. */
async function listMyGigs(req, res, next) {
  try {
    const gigs = await Gig.find({ freelancer: req.user.id })
      .sort({ createdAt: -1 })
      .populate('freelancer', 'fullName');

    return res.status(200).json({ gigs: gigs.map(toPublicGig) });
  } catch (err) {
    return next(err);
  }
}

async function getGig(req, res, next) {
  try {
    const gig = await loadGig(req.params.id);

    // Inactive gigs are only visible to their owner.
    if (!gig.isActive && ownerId(gig) !== req.user.id) {
      throw new AppError('Gig not found', 404);
    }

    return res.status(200).json({ gig: toPublicGig(gig) });
  } catch (err) {
    return next(err);
  }
}

async function updateGig(req, res, next) {
  try {
    const gig = await loadOwnedGig(req);

    for (const field of GIG_FIELDS) {
      if (req.body[field] !== undefined) {
        gig[field] = req.body[field];
      }
    }
    await gig.save();

    logEvent('info', 'gig_updated', { userId: req.user.id, gigId: req.params.id });
    return res.status(200).json({ message: 'Gig updated', gig: toPublicGig(gig) });
  } catch (err) {
    return next(err);
  }
}

async function deleteGig(req, res, next) {
  try {
    const gig = await loadOwnedGig(req);
    await gig.deleteOne();

    logEvent('info', 'gig_deleted', { userId: req.user.id, gigId: req.params.id });
    return res.status(200).json({ message: 'Gig deleted' });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createGig, listGigs, listMyGigs, getGig, updateGig, deleteGig };
