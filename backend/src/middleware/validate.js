/**
 * Runs express-validator results and rejects invalid or unexpected input.
 *
 * All user input is validated before business logic runs. Invalid or malicious
 * payloads are rejected with a 400 response that does not echo raw input
 * (OWASP, 2025c; Expressjs, 2025).
 */

const { validationResult } = require('express-validator');
const { AppError } = require('../utils/appError');

function rejectUnknownFields(allowedFields) {
  return (req, res, next) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const extra = Object.keys(body).filter((key) => !allowedFields.includes(key));

    if (extra.length > 0) {
      return next(new AppError('Unexpected fields in request', 400));
    }

    return next();
  };
}

function validate(req, res, next) {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  const details = errors.array().map((item) => ({
    field: item.path,
    message: item.msg,
  }));

  return res.status(400).json({
    error: {
      message: 'Invalid request data',
      details,
    },
  });
}

module.exports = { rejectUnknownFields, validate };
