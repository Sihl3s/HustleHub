/**
 * User persistence (MongoDB via Mongoose).
 *
 * Returns plain objects with an `id` string and, for lookups used by login,
 * the passwordHash. Controllers strip the hash before responding
 * (OWASP, 2025d).
 */

const mongoose = require('mongoose');
const User = require('./User');
const { AppError } = require('../utils/appError');

function toRecord(doc) {
  if (!doc) {
    return null;
  }

  return {
    id: doc._id.toString(),
    email: doc.email,
    fullName: doc.fullName,
    role: doc.role,
    passwordHash: doc.passwordHash,
    failedLoginAttempts: doc.failedLoginAttempts || 0,
    lockUntil: doc.lockUntil ? doc.lockUntil.toISOString() : null,
    tokenVersion: doc.tokenVersion || 0,
    createdAt: doc.createdAt.toISOString(),
  };
}

/**
 * Finds a stored user by email (case-insensitive; emails are stored lower-case).
 *
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function findByEmail(email) {
  if (typeof email !== 'string' || email.length === 0) {
    return null;
  }

  return toRecord(await User.findOne({ email: email.trim().toLowerCase() }));
}

/**
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  if (typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
    return null;
  }

  return toRecord(await User.findById(id));
}

/**
 * Creates and persists a new user record.
 *
 * @param {{ email: string, fullName: string, role: string, passwordHash: string }} userInput
 * @returns {Promise<object>}
 */
async function createUser(userInput) {
  if (!userInput || !userInput.email || !userInput.passwordHash) {
    throw new AppError('User record is incomplete', 400);
  }

  const { email, fullName, role, passwordHash } = userInput;

  try {
    return toRecord(await User.create({ email, fullName, role, passwordHash }));
  } catch (err) {
    if (err && err.code === 11000) {
      throw new AppError('An account with this email already exists', 409);
    }
    throw err;
  }
}

// Five failures lock the account for 15 minutes (OWASP, 2025a).
const LOCK_THRESHOLD = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

/**
 * Reads the token version used to reject logged-out access tokens.
 * The password hash is not loaded.
 *
 * @param {string} id
 * @returns {Promise<{ tokenVersion: number }|null>}
 */
async function getAuthState(id) {
  if (typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
    return null;
  }

  const doc = await User.findById(id).select('tokenVersion');
  if (!doc) {
    return null;
  }

  return { tokenVersion: doc.tokenVersion || 0 };
}

/**
 * Counts a failed password for an existing account and locks it at the threshold.
 *
 * @param {string} id
 * @returns {Promise<{ locked: boolean, attempts: number }|null>}
 */
async function recordFailedLogin(id) {
  const doc = await User.findByIdAndUpdate(
    id,
    { $inc: { failedLoginAttempts: 1 } },
    { new: true }
  );

  if (!doc) {
    return null;
  }

  const locked = doc.failedLoginAttempts >= LOCK_THRESHOLD;
  if (locked) {
    doc.lockUntil = new Date(Date.now() + LOCK_WINDOW_MS);
    await doc.save();
  }

  return { locked, attempts: doc.failedLoginAttempts };
}

/** Clears a lockout after a successful login or an expired lock window. */
async function clearLoginFailures(id) {
  await User.findByIdAndUpdate(id, { failedLoginAttempts: 0, lockUntil: null });
}

/**
 * Invalidates access tokens issued before this logout (OWASP, 2025i).
 *
 * @param {string} id
 * @returns {Promise<number|null>} the new token version
 */
async function incrementTokenVersion(id) {
  const doc = await User.findByIdAndUpdate(
    id,
    { $inc: { tokenVersion: 1 } },
    { new: true }
  );
  return doc ? doc.tokenVersion : null;
}

module.exports = {
  findByEmail,
  findById,
  createUser,
  getAuthState,
  recordFailedLogin,
  clearLoginFailures,
  incrementTokenVersion,
  LOCK_THRESHOLD,
  LOCK_WINDOW_MS,
};
