const mongoose = require('mongoose');

const examQuestionSchema = new mongoose.Schema({
  exam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  question_text: { type: String, required: true },
  type: { type: String, default: 'MCQ' },
  question_type: { type: String, default: 'mcq' },
  option_a: { type: String, default: null },
  option_b: { type: String, default: null },
  option_c: { type: String, default: null },
  option_d: { type: String, default: null },
  options: { type: mongoose.Schema.Types.Mixed },
  correct_option: { type: String, default: null },
  correct_answer: { type: String, default: null },
  marks: { type: Number, required: true, default: 1 },
  sort_order: { type: Number, default: 0 }
}, { strict: false });

module.exports = mongoose.model('ExamQuestion', examQuestionSchema);