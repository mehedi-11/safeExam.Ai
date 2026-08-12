const mongoose = require('mongoose');

const eventRegistrationSchema = new mongoose.Schema({
  event_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Event' },
  student_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Student' },
  registration_date: { type: Date, default: Date.now },
  status: { type: String, enum: ['registered', 'attended'], default: 'registered' }
});

module.exports = mongoose.model('EventRegistration', eventRegistrationSchema);
