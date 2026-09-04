/**
 * Structured event logger for key API actions.
 *
 * Log authentication outcomes and request metadata, but never passwords,
 * tokens, or other secrets (OWASP, 2025b).
 */

function sanitiseMeta(meta) {
  const blocked = ['password', 'token', 'authorization', 'jwt', 'secret', 'passwordHash'];
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
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitiseMeta(meta),
  };

  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

module.exports = { logEvent };
