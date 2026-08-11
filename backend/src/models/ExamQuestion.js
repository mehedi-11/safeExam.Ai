const mongoose = require('mongoose');
const examQuestionSchema = new mongoose.Schema({
  exam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },
  question_text: { type: String, required: true },
  question_type: { type: String, enum: ['mcq', 'descriptive'], required: true },
  options: { type: mongoose.Schema.Types.Mixed },
  correct_answer: { type: String },
  marks: { type: Number, required: true }
});
module.exports = mongoose.model('ExamQuestion', examQuestionSchema);