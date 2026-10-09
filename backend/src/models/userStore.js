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

module.exports = {
  findByEmail,
  findById,
  createUser,
};
