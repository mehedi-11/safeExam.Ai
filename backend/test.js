const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/online_exam').then(async () => {
  const StudentExam = require('./src/models/StudentExam');
  const Student = require('./src/models/Student');
  const stats = await StudentExam.aggregate([
    { $group: { _id: '$student_id', totalExams: { $sum: 1 }, avgScore: { $avg: '$total_score' } } }
  ]);
  const statsMap = {};
  stats.forEach(s => { statsMap[s._id] = s; });
  const students = await Student.find().select('id name email');
  
  const response = students.map(st => {
      const obj = st.toObject();
      const s = statsMap[obj.id] || { totalExams: 0, avgScore: 0 };
      obj.totalExams = s.totalExams;
      obj.avgScore = s.avgScore ? Math.round(s.avgScore) : 0;
      return obj;
    });

  console.log(response);
  process.exit(0);
});
