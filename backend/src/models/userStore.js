/**
 * Part 1 user store (file-based JSON).
 *
 * A database is not required until a later POE part. Users are persisted in
 * backend/data/users.json (gitignored). Only the hash from hashPassword is
 * stored — never the plain-text password (OWASP, 2025d).
 */

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { AppError } = require('../utils/appError');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, '[]', 'utf8');
  }
}

async function readUsers() {
  await ensureStore();
  const raw = await fs.readFile(USERS_FILE, 'utf8');

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    throw new AppError('User store could not be read', 500);
  }
}

async function writeUsers(users) {
  await ensureStore();
  const tempFile = `${USERS_FILE}.tmp`;
  await fs.writeFile(tempFile, `${JSON.stringify(users, null, 2)}\n`, 'utf8');
  await fs.rename(tempFile, USERS_FILE);
}

function normaliseEmail(email) {
  return String(email).trim().toLowerCase();
}

/**
 * Finds a stored user by email.
 *
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function findByEmail(email) {
  if (typeof email !== 'string' || email.length === 0) {
    return null;
  }

  const needle = normaliseEmail(email);
  const users = await readUsers();
  return users.find((user) => normaliseEmail(user.email) === needle) || null;
}

/**
 * Creates and persists a new user record.
 *
 * @param {{ email: string, fullName: string, role: string, passwordHash: string }} userInput
 * @returns {Promise<object>}
 */
async function createUser(userInput) {
  if (!userInput || !userInput.email || !userInput.passwordHash) {
    throw new AppError('User record is incomplete', 400);
  }

  const users = await readUsers();
  const user = {
    id: crypto.randomUUID(),
    email: normaliseEmail(userInput.email),
    fullName: userInput.fullName,
    role: userInput.role,
    passwordHash: userInput.passwordHash,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  await writeUsers(users);
  return user;
}

module.exports = {
  findByEmail,
  createUser,
};
