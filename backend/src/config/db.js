/**
 * MongoDB connection. The connection string comes from the environment so
 * credentials are never hard-coded (OWASP, 2025a).
 */

const mongoose = require('mongoose');
const { logEvent } = require('../utils/logger');

async function connectDb(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  logEvent('info', 'db_connected');
}

async function disconnectDb() {
  await mongoose.disconnect();
}

module.exports = { connectDb, disconnectDb };
