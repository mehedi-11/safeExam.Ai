const mongoose = require('mongoose');
const loginAttemptSchema = new mongoose.Schema({
  identifier: { type: String, required: true, unique: true },
  attempts: { type: Number, default: 1 },
  last_attempt: { type: Date, default: Date.now },
  lock_until: { type: Date, default: null }
});
module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);