/**
 * Handles requests that do not match any registered route.
 */

const { AppError } = require('../utils/appError');

function notFound(req, res, next) {
  next(new AppError('The requested resource was not found', 404));
}

module.exports = { notFound };
