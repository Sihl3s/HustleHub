/**
 * Runs the Postman collection with Newman against a throwaway copy of the API.
 *
 * The API is started over HTTPS on a free local port with a temporary
 * self-signed certificate and an in-memory MongoDB, so the tests always start
 * from an empty database and do not need a local mongod or the certs folder.
 * A JUnit report and the API's security event log are written to
 * docs/evidence for the submission.
 *
 * Run from the backend folder:
 *   npm run test:api
 */

const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const path = require('path');
const newman = require('newman');
const selfsigned = require('selfsigned');
const { MongoMemoryServer } = require('mongodb-memory-server');

const collectionPath = path.join(__dirname, '..', '..', 'postman', 'HustleHub.postman_collection.json');
const evidenceDir = path.join(__dirname, '..', '..', 'docs', 'evidence');
const serverLogPath = path.join(evidenceDir, 'newman-server-events.jsonl');

fs.mkdirSync(evidenceDir, { recursive: true });
fs.writeFileSync(serverLogPath, '');

process.env.JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.LOG_FILE = serverLogPath;

const app = require('../src/app');
const { connectDb, disconnectDb } = require('../src/config/db');

function createTlsOptions() {
  const pems = selfsigned.generate([{ name: 'commonName', value: 'localhost' }], {
    keySize: 2048,
    days: 1,
    algorithm: 'sha256',
    extensions: [{ name: 'subjectAltName', altNames: [{ type: 7, ip: '127.0.0.1' }] }],
  });
  return { key: pems.private, cert: pems.cert };
}

function runCollection(baseUrl) {
  return new Promise((resolve, reject) => {
    newman.run(
      {
        collection: collectionPath,
        envVar: [{ key: 'baseUrl', value: baseUrl }],
        insecure: true,
        reporters: ['cli', 'junit'],
        reporter: { junit: { export: path.join(evidenceDir, 'newman-junit.xml') } },
      },
      (err, summary) => (err ? reject(err) : resolve(summary))
    );
  });
}

async function main() {
  const mongod = await MongoMemoryServer.create();
  await connectDb(mongod.getUri());

  const server = https.createServer(createTlsOptions(), app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `https://127.0.0.1:${server.address().port}`;

  let failures = 1;
  try {
    const summary = await runCollection(baseUrl);
    failures = summary.run.failures.length;
  } finally {
    server.close();
    await disconnectDb();
    await mongod.stop();
  }

  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(`API test run failed: ${err.message}`);
  process.exitCode = 1;
});
