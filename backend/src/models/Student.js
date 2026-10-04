const mongoose = require('mongoose');
const studentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  dob: { type: Date },
  university: { type: String },
  address: { type: String },
  joining_date: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'blocked', 'suspended', 'pending', 'approved'], default: 'active' }
});
module.exports = mongoose.model('Student', studentSchema);