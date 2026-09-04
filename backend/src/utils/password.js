/**
 * TODO(Lesedi): implement password hashing with bcrypt.
 *
 * Passwords must never be stored or compared in plain text. Use a slow,
 * salted algorithm such as bcrypt with a work factor of at least 10
 * (OWASP, 2025d; Grassi et al., 2017).
 *
 * Suggested package (already listed in package.json):
 *   const bcrypt = require('bcryptjs');
 *
 * hashPassword:
 *   - accept the plain password string from the validated request
 *   - return the bcrypt hash only (never log or return the plain password)
 *   - use bcrypt.hash(plainPassword, 12) or similar cost >= 10
 *
 * verifyPassword:
 *   - compare a login attempt against the stored hash with bcrypt.compare
 *   - return true or false
 *   - use bcrypt.compare (do not write == yourself)
 */

const { AppError } = require('./appError');

function notImplemented(feature) {
  return new AppError(`${feature} is not implemented yet`, 501);
}

/**
 * Hashes a plain-text password for storage.
 *
 * @param {string} plainPassword
 * @returns {Promise<string>} bcrypt hash
 */
async function hashPassword(plainPassword) {
  if (typeof plainPassword !== 'string' || plainPassword.length === 0) {
    throw new AppError('Password is required', 400);
  }

  throw notImplemented('Password hashing');
}

/**
 * Checks a plain-text password against a stored hash.
 *
 * @param {string} plainPassword
 * @param {string} passwordHash
 * @returns {Promise<boolean>}
 */
async function verifyPassword(plainPassword, passwordHash) {
  if (typeof plainPassword !== 'string' || typeof passwordHash !== 'string') {
    return false;
  }

  throw notImplemented('Password verification');
}

module.exports = {
  hashPassword,
  verifyPassword,
};
