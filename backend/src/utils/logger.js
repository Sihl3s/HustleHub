/**
 * Structured event logger for key API actions.
 *
 * Log authentication outcomes and request metadata, but never passwords,
 * tokens, or other secrets (OWASP, 2025b). Events go to the console, or to
 * the file named in LOG_FILE when that is set.
 */

const fs = require('fs');

function sanitiseMeta(meta) {
  const blocked = ['password', 'token', 'authorization', 'jwt', 'secret', 'passwordhash'];
  const safe = {};

  for (const [key, value] of Object.entries(meta || {})) {
    if (blocked.includes(key.toLowerCase())) {
      continue;
    }
    safe[key] = value;
  }

  return safe;
}

function logEvent(level, event, meta = {}) {
  // Keeps Jest output readable; set LOG_IN_TESTS=true to see events while testing.
  if (process.env.NODE_ENV === 'test' && process.env.LOG_IN_TESTS !== 'true') {
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitiseMeta(meta),
  };

  const line = JSON.stringify(entry);

  if (process.env.LOG_FILE) {
    fs.appendFileSync(process.env.LOG_FILE, `${line}\n`);
    return;
  }

  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

module.exports = { logEvent };
