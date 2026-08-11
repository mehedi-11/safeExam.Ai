const mongoose = require('mongoose');
const studentExamSchema = new mongoose.Schema({
  student_id: { type: String, ref: 'Student' },
  exam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },
  status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  started_at: { type: Date },
  completed_at: { type: Date },
  total_score: { type: Number, default: 0 },
  demerit_points: { type: Number, default: 0 },
  block_until: { type: Date, default: null }
});
module.exports = mongoose.model('StudentExam', studentExamSchema);