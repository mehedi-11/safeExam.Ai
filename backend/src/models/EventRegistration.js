const mongoose = require('mongoose');

const eventRegistrationSchema = new mongoose.Schema({
  event_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Event' },
  student_id: { type: String },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  security_code: { type: String, required: true },
  registration_date: { type: Date, default: Date.now },
  status: { type: String, enum: ['registered', 'attended'], default: 'registered' }
});

module.exports = mongoose.model('EventRegistration', eventRegistrationSchema);
