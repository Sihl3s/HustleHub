/**
 * Rate limiters for sensitive endpoints.
 *
 * Login and registration are limited per IP to slow down credential stuffing
 * and brute-force attempts. Booking creation is limited per authenticated user
 * so one account cannot flood freelancers with bookings or generate large
 * numbers of transaction records. Gig writes and the API as a whole get looser
 * limits to absorb scripted abuse (OWASP, 2025a; express-rate-limit, 2025).
 *
 * Limits can be tuned in .env. Under Jest (NODE_ENV=test) the defaults are
 * raised so ordinary test suites are not throttled; the security tests set
 * explicit low values to prove the 429 behaviour.
 */

const rateLimit = require('express-rate-limit');
// Loads .env before the limits below are read.
require('../config/env');
const { logEvent } = require('../utils/logger');

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

function limitFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  if (Number.isInteger(value) && value > 0) {
    return value;
  }
  return process.env.NODE_ENV === 'test' ? 1000 : fallback;
}

function createLimiter({ name, windowMs, max, message, keyGenerator }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    ...(keyGenerator ? { keyGenerator } : {}),
    handler: (req, res) => {
      logEvent('warn', 'rate_limited', {
        limiter: name,
        path: `${req.baseUrl}${req.path}`,
        userId: req.user ? req.user.id : undefined,
      });
      res.status(429).json({ error: { message } });
    },
  });
}

const apiLimiter = createLimiter({
  name: 'api',
  windowMs: FIFTEEN_MINUTES,
  max: limitFromEnv('API_RATE_LIMIT_MAX', 300),
  message: 'Too many requests. Please slow down and try again later.',
});

const authLimiter = createLimiter({
  name: 'auth',
  windowMs: FIFTEEN_MINUTES,
  max: limitFromEnv('AUTH_RATE_LIMIT_MAX', 20),
  message: 'Too many authentication attempts. Please try again later.',
});

// Runs after authenticate(), so the limit follows the account, not the IP.
const bookingLimiter = createLimiter({
  name: 'booking',
  windowMs: ONE_HOUR,
  max: limitFromEnv('BOOKING_RATE_LIMIT_MAX', 10),
  message: 'Too many bookings in a short period. Please try again later.',
  keyGenerator: (req) => `user:${req.user.id}`,
});

const writeLimiter = createLimiter({
  name: 'gig_write',
  windowMs: FIFTEEN_MINUTES,
  max: limitFromEnv('WRITE_RATE_LIMIT_MAX', 60),
  message: 'Too many changes in a short period. Please try again later.',
  keyGenerator: (req) => `user:${req.user.id}`,
});

module.exports = { apiLimiter, authLimiter, bookingLimiter, writeLimiter };
