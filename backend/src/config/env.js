/**
 * Loads and validates process environment for the API.
 *
 * Secrets such as JWT_SECRET must come from the environment, not from
 * hard-coded values in source files (OWASP, 2025a).
 */

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

function requireJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to a string of at least 32 characters');
  }

  if (secret === 'replace-with-at-least-32-character-secret-key') {
    throw new Error('JWT_SECRET must be changed from the example placeholder');
  }

  return secret;
}

function loadEnv() {
  return {
    port: Number(process.env.PORT) || 3443,
    jwtSecret: requireJwtSecret(),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    nodeEnv: process.env.NODE_ENV || 'development',
    certKeyPath: path.join(__dirname, '..', '..', 'certs', 'key.pem'),
    certPath: path.join(__dirname, '..', '..', 'certs', 'cert.pem'),
  };
}

module.exports = { loadEnv };
