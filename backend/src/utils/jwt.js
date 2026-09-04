/**
 * JWT access-token helpers.
 *
 * Tokens are signed with HS256 and verified with an explicit algorithm list so
 * that algorithm confusion attacks are rejected. Every protected request must
 * present a valid token (Sheffer, Hardt and Jones, 2020; OWASP, 2025a).
 */

const jwt = require('jsonwebtoken');
const { loadEnv } = require('../config/env');
const { AppError } = require('./appError');

function getJwtOptions() {
  const { jwtSecret, jwtExpiresIn } = loadEnv();
  return { jwtSecret, jwtExpiresIn };
}

/**
 * Creates a short-lived access token for an authenticated user.
 *
 * @param {{ id: string, email: string, role: string, fullName: string }} user
 * @returns {string}
 */
function signAccessToken(user) {
  const { jwtSecret, jwtExpiresIn } = getJwtOptions();

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
    jwtSecret,
    {
      algorithm: 'HS256',
      expiresIn: jwtExpiresIn,
    }
  );
}

/**
 * Validates a bearer token and returns the payload used by route handlers.
 *
 * @param {string} token
 * @returns {{ id: string, email: string, role: string, fullName: string }}
 */
function verifyAccessToken(token) {
  const { jwtSecret } = getJwtOptions();

  try {
    const payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });

    if (!payload || typeof payload.sub !== 'string') {
      throw new AppError('Invalid or expired token', 401);
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName,
    };
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError('Invalid or expired token', 401);
  }
}

module.exports = { signAccessToken, verifyAccessToken };
