const mongoose = require('mongoose');
const proctoringLogSchema = new mongoose.Schema({
  student_id: { type: String, ref: 'Student' },
  exam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },
  activity_type: { type: String, required: true },
  details: { type: String },
  demerit_points: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model('ProctoringLog', proctoringLogSchema);