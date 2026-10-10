/**
 * JWT access-token helpers.
 *
 * Tokens are signed with HS256 and verified with an explicit algorithm list so
 * that algorithm confusion and "alg: none" tokens are rejected. Issuer and
 * audience claims bind a token to this API, and the role claim must be one of
 * the known roles. Every protected request must present a valid token
 * (Sheffer, Hardt and Jones, 2020; OWASP, 2025a).
 */

const jwt = require('jsonwebtoken');
const { loadEnv } = require('../config/env');
const { AppError } = require('./appError');
const { ROLES } = require('../validators/authValidators');

function getJwtOptions() {
  const { jwtSecret, jwtExpiresIn, jwtIssuer, jwtAudience } = loadEnv();
  return { jwtSecret, jwtExpiresIn, jwtIssuer, jwtAudience };
}

/**
 * Creates a short-lived access token for an authenticated user.
 *
 * @param {{ id: string, email: string, role: string, fullName: string }} user
 * @returns {string}
 */
function signAccessToken(user) {
  const { jwtSecret, jwtExpiresIn, jwtIssuer, jwtAudience } = getJwtOptions();

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
      issuer: jwtIssuer,
      audience: jwtAudience,
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
  const { jwtSecret, jwtIssuer, jwtAudience } = getJwtOptions();

  try {
    const payload = jwt.verify(token, jwtSecret, {
      algorithms: ['HS256'],
      issuer: jwtIssuer,
      audience: jwtAudience,
    });

    if (!payload || typeof payload.sub !== 'string' || !ROLES.includes(payload.role)) {
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
