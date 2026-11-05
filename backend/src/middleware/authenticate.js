/**
 * JWT authentication middleware for routes beyond login and register.
 *
 * The assignment requires JWTs to identify authenticated users on subsequent
 * requests. Tokens are read from the Authorization: Bearer header and verified
 * on every protected request. Logout also checks that the token version still
 * matches the user record, so a logged-out token is rejected
 * (Sheffer, Hardt and Jones, 2020; OWASP, 2025i).
 */

const { AppError } = require('../utils/appError');
const { verifyAccessToken } = require('../utils/jwt');
const { getAuthState } = require('../models/userStore');
const { logEvent } = require('../utils/logger');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
    logEvent('info', 'auth_missing_token', { path: `${req.baseUrl}${req.path}` });
    return next(new AppError('Authentication required', 401));
  }

  const token = header.slice('Bearer '.length).trim();

  if (!token) {
    return next(new AppError('Authentication required', 401));
  }

  try {
    const payload = verifyAccessToken(token);
    const authState = await getAuthState(payload.id);

    // A missing user or an older token version means the session was ended.
    if (!authState || authState.tokenVersion !== payload.tokenVersion) {
      logEvent('info', 'auth_invalid_token', { path: `${req.baseUrl}${req.path}` });
      return next(new AppError('Invalid or expired token', 401));
    }

    req.user = payload;
    return next();
  } catch (err) {
    logEvent('info', 'auth_invalid_token', { path: `${req.baseUrl}${req.path}` });
    return next(err);
  }
}

module.exports = { authenticate };
