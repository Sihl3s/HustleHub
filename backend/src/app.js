/**
 * HustleHub+ Express application (no listen() here — HTTPS is started in server.js).
 *
 * Middleware is ordered so that security headers, body limits, sanitisation
 * and rate limits run before route handlers (Expressjs, 2025; Helmetjs, 2025;
 * OWASP, 2025c).
 *
 * The API only ever returns JSON, so its Content Security Policy denies every
 * resource type and framing. HSTS is only sent in production so browsers do
 * not cache a strict HTTPS policy against the local self-signed certificate.
 * CORS is deliberately not enabled: the React app reaches the API through the
 * Vite proxy on the same origin, so browsers block cross-site callers.
 */

const express = require('express');
const helmet = require('helmet');
const { logEvent } = require('./utils/logger');
const { notFound } = require('./middleware/notFound');
const { errorHandler } = require('./middleware/errorHandler');
const { sanitizeRequest, requireJsonBody } = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimiters');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const meRoutes = require('./routes/me');
const gigRoutes = require('./routes/gigs');
const bookingRoutes = require('./routes/bookings');
const transactionRoutes = require('./routes/transactions');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
  })
);

app.use((req, res, next) => {
  logEvent('info', 'request', { method: req.method, path: req.path });
  next();
});

app.use(requireJsonBody);
app.use(express.json({ limit: '16kb' }));
app.use(sanitizeRequest);

// Responses can contain tokens, bookings and income figures; never cache them.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');
  next();
});

app.use('/api', apiLimiter);

app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/transactions', transactionRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
