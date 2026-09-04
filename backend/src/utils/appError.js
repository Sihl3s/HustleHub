/**
 * Operational HTTP error.
 *
 * Distinguishing expected client errors from unexpected failures lets the
 * error handler return a safe message without leaking internals
 * (Expressjs, 2025).
 */
class AppError extends Error {
  /**
   * @param {string} message Message that is safe to return to the client
   * @param {number} statusCode HTTP status code
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

module.exports = { AppError };
