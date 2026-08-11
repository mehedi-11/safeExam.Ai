const mongoose = require('mongoose');
const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  is_super_admin: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Admin', adminSchema);