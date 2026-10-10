/**
 * Request sanitisation applied to every route.
 *
 * MongoDB treats keys that start with "$" as query operators and keys with "."
 * as nested paths, so a body such as {"email": {"$gt": ""}} could turn a lookup
 * into "match anything" (NoSQL injection). Keys like "__proto__" can pollute
 * object prototypes. Requests carrying any of these keys are rejected outright
 * rather than silently cleaned, so the attempt is visible in the logs
 * (OWASP, 2025c; OWASP, 2025e).
 */

const { AppError } = require('../utils/appError');
const { logEvent } = require('../utils/logger');

const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_DEPTH = 10;

function findUnsafeKey(value, depth = 0) {
  if (value === null || typeof value !== 'object') {
    return null;
  }

  if (depth > MAX_DEPTH) {
    return '(nesting too deep)';
  }

  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.') || BLOCKED_KEYS.has(key)) {
      return key;
    }

    const nested = findUnsafeKey(value[key], depth + 1);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function sanitizeRequest(req, res, next) {
  for (const location of ['body', 'query', 'params']) {
    if (findUnsafeKey(req[location])) {
      logEvent('warn', 'unsafe_input_rejected', { location, path: req.path });
      return next(new AppError('Request contains disallowed characters in field names', 400));
    }
  }

  return next();
}

/**
 * Bodies on write requests must be JSON. Anything else (form posts, XML, plain
 * text) is refused before it reaches the parsers or the route handlers.
 */
function requireJsonBody(req, res, next) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  const hasBody = Number(req.headers['content-length']) > 0 || Boolean(req.headers['transfer-encoding']);

  if (hasBody && !req.is('application/json')) {
    return next(new AppError('Content-Type must be application/json', 415));
  }

  return next();
}

module.exports = { sanitizeRequest, requireJsonBody, findUnsafeKey };
