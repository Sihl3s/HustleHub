/**
 * HTTPS entry point for the HustleHub+ API.
 *
 * Serving the API over TLS protects credentials and tokens in transit.
 * A locally generated certificate is used for this Part 1 submission
 * (Expressjs, 2025; Node.js, 2025).
 */

const fs = require('fs');
const https = require('https');
const { loadEnv } = require('./src/config/env');
const { logEvent } = require('./src/utils/logger');
const app = require('./src/app');

function readCertFiles(env) {
  if (!fs.existsSync(env.certKeyPath) || !fs.existsSync(env.certPath)) {
    throw new Error(
      'TLS certificate files are missing. Run npm run generate-certs from the backend folder, then start the server again.'
    );
  }

  return {
    key: fs.readFileSync(env.certKeyPath),
    cert: fs.readFileSync(env.certPath),
  };
}

function start() {
  const env = loadEnv();
  const tlsOptions = readCertFiles(env);

  const server = https.createServer(tlsOptions, app);

  server.listen(env.port, '127.0.0.1', () => {
    logEvent('info', 'server_started', {
      protocol: 'https',
      host: '127.0.0.1',
      port: env.port,
    });
    console.log(`HustleHub+ API listening on https://127.0.0.1:${env.port}`);
    console.log('Postman: disable SSL certificate verification for this local self-signed cert.');
  });
}

start();
