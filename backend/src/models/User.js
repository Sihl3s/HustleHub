/**
 * User collection. Only the bcrypt hash is stored, never the password
 * (OWASP, 2025d).
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    role: { type: String, required: true, enum: ['client', 'freelancer', 'admin'] },
    passwordHash: { type: String, required: true },
    // Consecutive bad passwords. Reset after a successful login (OWASP, 2025a).
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    // Incremented on logout so older access tokens stop being accepted (OWASP, 2025i).
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
