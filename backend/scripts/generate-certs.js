/**
 * Generates a local self-signed TLS certificate for HTTPS development.
 *
 * The assignment requires the API to be served over HTTPS with a locally
 * configured SSL certificate. A self-signed cert is appropriate for localhost
 * because browsers and HTTP clients (such as Postman) can be told to trust it
 * for development, while traffic is still encrypted in transit
 * (Expressjs, 2025; Node.js, 2025).
 *
 * Run from the backend folder:
 *   npm run generate-certs
 */

const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');

const certsDir = path.join(__dirname, '..', 'certs');

if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

const attrs = [{ name: 'commonName', value: 'localhost' }];

const pems = selfsigned.generate(attrs, {
  keySize: 2048,
  days: 365,
  algorithm: 'sha256',
  extensions: [
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
      ],
    },
  ],
});

const keyPath = path.join(certsDir, 'key.pem');
const certPath = path.join(certsDir, 'cert.pem');

fs.writeFileSync(keyPath, pems.private);
fs.writeFileSync(certPath, pems.cert);

console.log('Created local TLS files:');
console.log(`  ${keyPath}`);
console.log(`  ${certPath}`);
console.log('These files are gitignored. Re-run this script if they are missing.');
