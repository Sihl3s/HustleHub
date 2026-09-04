/**
 * TODO(Lesedi): implement the Part 1 user store (file-based JSON).
 *
 * A database is not required until a later POE part. Persist users in
 * backend/data/users.json (that path is gitignored). Never write the
 * plain-text password — only the hash produced by hashPassword
 * (OWASP, 2025d).
 *
 * Expected record shape:
 * {
 *   id: string,              // crypto.randomUUID()
 *   email: string,           // store lower-case / normalised email
 *   fullName: string,
 *   role: 'client' | 'freelancer' | 'admin',
 *   passwordHash: string,    // bcrypt hash only
 *   createdAt: string        // ISO timestamp
 * }
 *
 * Implementation notes:
 *   1. Read the JSON file if it exists; start with [] if it does not.
 *   2. findByEmail(email) should return the full record (including passwordHash)
 *      or null when no user matches. Matching must be case-insensitive.
 *   3. createUser({ email, fullName, role, passwordHash }) should:
 *        - generate id and createdAt
 *        - append the user
 *        - write the file atomically enough for a student demo
 *        - return the saved record
 *   4. Do not expose passwordHash in HTTP responses — auth routes strip it.
 */

const { AppError } = require('../utils/appError');

function notImplemented(feature) {
  return new AppError(`${feature} is not implemented yet`, 501);
}

/**
 * Finds a stored user by email.
 *
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function findByEmail(email) {
  if (typeof email !== 'string' || email.length === 0) {
    return null;
  }

  throw notImplemented('User lookup');
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

  throw notImplemented('User storage');
}

module.exports = {
  findByEmail,
  createUser,
};
