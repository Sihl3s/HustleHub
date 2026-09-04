/**
 * JWT authentication middleware for routes beyond login and register.
 *
 * The assignment requires JWTs to identify authenticated users on subsequent
 * requests. Tokens are read from the Authorization: Bearer header and verified
 * on every protected request (Sheffer, Hardt and Jones, 2020; OWASP, 2025a).
 */

const { AppError } = require('../utils/appError');
const { verifyAccessToken } = require('../utils/jwt');
const { logEvent } = require('../utils/logger');

function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
    logEvent('info', 'auth_missing_token', { path: req.path });
    return next(new AppError('Authentication required', 401));
  }

  const token = header.slice('Bearer '.length).trim();

  if (!token) {
    return next(new AppError('Authentication required', 401));
  }

  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch (err) {
    logEvent('info', 'auth_invalid_token', { path: req.path });
    return next(err);
  }
}

module.exports = { authenticate };
