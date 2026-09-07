/**
 * Password hashing helpers.
 *
 * Passwords must never be stored or compared in plain text. bcrypt is a slow,
 * salted algorithm; a work factor of 12 meets the minimum of 10 recommended
 * for bcrypt (OWASP, 2025d; Grassi et al., 2017).
 */

const bcrypt = require('bcryptjs');
const { AppError } = require('./appError');

const BCRYPT_ROUNDS = 12;

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

  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
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

  return bcrypt.compare(plainPassword, passwordHash);
}

module.exports = {
  hashPassword,
  verifyPassword,
};
