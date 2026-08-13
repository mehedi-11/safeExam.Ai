const mongoose = require('mongoose');
const examSchema = new mongoose.Schema({
  teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  title: { type: String, required: true },
  description: { type: String },
  exam_date: { type: Date, required: true },
  duration_minutes: { type: Number, required: true },
  total_marks: { type: Number, required: true },
  exam_password: { type: String },
  is_live: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Exam', examSchema);