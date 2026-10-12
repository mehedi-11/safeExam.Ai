const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    lowercase: true, 
    trim: true,
    index: true 
  },
  otp: { 
    type: String, 
    required: true 
  },
  purpose: { 
    type: String, 
    enum: ['registration', 'password_reset'], 
    default: 'registration' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: 600 // Automatically deletes from MongoDB after 10 minutes (600s)
  }
});

module.exports = mongoose.model('Otp', otpSchema);
