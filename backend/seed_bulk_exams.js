const mongoose = require('mongoose');
require('dotenv').config();
const Teacher = require('./src/models/Teacher');
const Student = require('./src/models/Student');
const Exam = require('./src/models/Exam');
const StudentExam = require('./src/models/StudentExam');
const Event = require('./src/models/Event');
const connectDB = require('./src/config/db');

const runSeed = async () => {
  try {
    await connectDB();
    console.log('Database connected.');

    // Find the teacher
    const teacherEmail = "firegamingv8@gmail.com";
    const teacher = await Teacher.findOne({ email: teacherEmail });
    if (!teacher) {
      console.error('Teacher not found:', teacherEmail);
      process.exit(1);
    }

    // Find a live event for the teacher to associate exams, or create one
    let event = await Event.findOne({ created_by: teacher._id, status: 'live' });
    if (!event) {
      event = await Event.create({
        title: 'Bulk Exam Event',
        description: 'Generated event for bulk exams',
        event_date: new Date(),
        end_date: new Date(Date.now() + 86400000 * 30),
        created_by_model: 'Teacher',
        created_by: teacher._id,
        status: 'live'
      });
      console.log('Created a new event for the teacher.');
    }

    // Create 100 exams
    console.log('Generating 100 exams...');
    const examDocs = [];
    for (let i = 1; i <= 100; i++) {
      examDocs.push({
        teacher_id: teacher._id,
        event_id: event._id,
        title: `Bulk Exam ${i}`,
        description: `This is a bulk generated exam ${i}`,
        exam_date: new Date(),
        duration_minutes: 60,
        total_marks: 100,
        is_live: true,
        course_name: 'Bulk Course',
        course_code: 'BC101',
        university_name: 'Bulk University'
      });
    }
    const insertedExams = await Exam.insertMany(examDocs);
    console.log('Inserted 100 exams successfully.');

    // Get all students
    const students = await Student.find();
    if (students.length === 0) {
      console.log('No students found in the database. Exiting.');
      process.exit(0);
    }

    console.log(`Found ${students.length} students. Generating student_exams...`);
    
    let totalStudentExams = 0;

    for (const student of students) {
      // Random number between 80 and 100
      const numExams = Math.floor(Math.random() * (100 - 80 + 1)) + 80;
      
      // Shuffle exams array and pick numExams
      const shuffledExams = [...insertedExams].sort(() => 0.5 - Math.random());
      const selectedExams = shuffledExams.slice(0, numExams);

      const studentExamDocs = selectedExams.map(exam => ({
        student_id: student._id,
        exam_id: exam._id,
        status: 'completed',
        total_score: Math.floor(Math.random() * 101), // Random score between 0 and 100
        completed_at: new Date()
      }));

      await StudentExam.insertMany(studentExamDocs);
      
      // We also need to add these students to the event's registration maybe?
      // Since they took the exam, it's better to update Exam's submissions_count 
      // But we can skip that for now as it's a seed script, or update it manually.
      
      for (const exam of selectedExams) {
        await Exam.updateOne({ _id: exam._id }, { $inc: { submissions_count: 1 } });
      }

      totalStudentExams += numExams;
      console.log(`Student ${student.email} took ${numExams} exams.`);
    }

    console.log(`Total ${totalStudentExams} student_exam records generated successfully.`);
    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
};

runSeed();
