const mongoose = require('mongoose');
require('dotenv').config();
const Exam = require('./src/models/Exam');
const StudentExam = require('./src/models/StudentExam');
const ProctoringLog = require('./src/models/ProctoringLog');
const connectDB = require('./src/config/db');

const deleteAllExams = async () => {
  try {
    await connectDB();
    console.log('Database connected.');

    const examResult = await Exam.deleteMany({});
    console.log(`Deleted ${examResult.deletedCount} exams.`);

    const studentExamResult = await StudentExam.deleteMany({});
    console.log(`Deleted ${studentExamResult.deletedCount} student exam records.`);

    const proctoringLogResult = await ProctoringLog.deleteMany({});
    console.log(`Deleted ${proctoringLogResult.deletedCount} proctoring logs.`);

    console.log('All exams and related data deleted successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error during deletion:', error);
    process.exit(1);
  }
};

deleteAllExams();
