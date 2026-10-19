const mongoose = require('mongoose');
const studentExamSchema = new mongoose.Schema({
  student_id: { type: String, ref: 'Student' },
  exam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },
  status: { type: String, enum: ['pending', 'started', 'in_progress', 'blocked', 'completed', 'finished'], default: 'pending' },
  started_at: { type: Date },
  completed_at: { type: Date },
  finished_at: { type: Date },
  total_score: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  demerit_points: { type: Number, default: 0 },
  block_until: { type: Date, default: null },
  results_published: { type: Boolean, default: false },
  attempts: { type: Number, default: 1 },
  last_heartbeat: { type: Date, default: Date.now }
}, { strict: false });
module.exports = mongoose.model('StudentExam', studentExamSchema);