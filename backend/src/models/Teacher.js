const mongoose = require('mongoose');
const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profile_image: { type: String, default: null },
  joining_date: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'blocked', 'suspended', 'pending'], default: 'active' }
});
module.exports = mongoose.model('Teacher', teacherSchema);