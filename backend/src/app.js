/**
 * HustleHub+ Express application (no listen() here — HTTPS is started in server.js).
 *
 * Middleware is ordered so that security headers, body limits, and rate limits
 * run before route handlers (Expressjs, 2025; Helmetjs, 2025; OWASP, 2025c).
 * HSTS is left off for the local self-signed certificate so browsers do not
 * cache a strict HTTPS policy against an untrusted development cert.
 */

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { logEvent } = require('./utils/logger');
const { notFound } = require('./middleware/notFound');
const { errorHandler } = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const meRoutes = require('./routes/me');

const app = express();

app.disable('x-powered-by');

app.use(
  helmet({
    hsts: false,
  })
);

app.use(express.json({ limit: '16kb' }));

app.use((req, res, next) => {
  logEvent('info', 'request', { method: req.method, path: req.path });
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many authentication attempts. Please try again later.' } },
});

app.use('/api/auth', authLimiter);

app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/me', meRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
