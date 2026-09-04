/**
 * Final Express error middleware.
 *
 * Client responses must not include stack traces, file paths, or configuration
 * values. Unexpected errors are logged on the server and mapped to a generic
 * message (Expressjs, 2025; OWASP, 2024).
 */

const { logEvent } = require('../utils/logger');

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const isOperational = Boolean(err.isOperational);

  logEvent('error', 'request_failed', {
    method: req.method,
    path: req.path,
    statusCode,
    message: err.message,
  });

  if (!isOperational) {
    logEvent('error', 'unexpected_error', { name: err.name });
  }

  const clientMessage = isOperational && err.message
    ? err.message
    : 'An unexpected error occurred';

  res.status(statusCode).json({
    error: {
      message: clientMessage,
    },
  });
}

module.exports = { errorHandler };
