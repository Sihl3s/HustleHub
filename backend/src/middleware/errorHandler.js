/**
 * Final Express error middleware.
 *
 * Client responses must not include stack traces, file paths, or configuration
 * values. Known failure types (bad JSON, oversized bodies, invalid ids) are
 * mapped to short fixed messages; anything unexpected is logged on the server
 * and returned as a generic 500 (Expressjs, 2025; OWASP, 2024).
 */

const { logEvent } = require('../utils/logger');

function classifyError(err) {
  if (err.isOperational && Number.isInteger(err.statusCode)) {
    return { statusCode: err.statusCode, message: err.message, expected: true };
  }

  if (err.type === 'entity.parse.failed') {
    return { statusCode: 400, message: 'Request body is not valid JSON', expected: true };
  }

  if (err.type === 'entity.too.large') {
    return { statusCode: 413, message: 'Request body is too large', expected: true };
  }

  if (err.name === 'CastError' || err.name === 'ValidationError') {
    return { statusCode: 400, message: 'Invalid request data', expected: true };
  }

  return { statusCode: 500, message: 'An unexpected error occurred', expected: false };
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const { statusCode, message, expected } = classifyError(err);

  logEvent('error', 'request_failed', {
    method: req.method,
    path: req.path,
    statusCode,
    message: err.message,
  });

  if (!expected) {
    logEvent('error', 'unexpected_error', { name: err.name });
  }

  return res.status(statusCode).json({
    error: {
      message,
    },
  });
}

module.exports = { errorHandler };
