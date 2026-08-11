const mongoose = require('mongoose');
const studentAnswerSchema = new mongoose.Schema({
  student_id: { type: String, ref: 'Student' },
  exam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },
  question_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamQuestion' },
  answer_text: { type: String },
  is_correct: { type: Boolean, default: false },
  marks_awarded: { type: Number, default: 0 }
});
module.exports = mongoose.model('StudentAnswer', studentAnswerSchema);