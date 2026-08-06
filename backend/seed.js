const db = require('./src/config/db');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');

async function seedData() {
  console.log('Starting to seed database with more exams and results...');

  try {
    const passwordHash = await bcrypt.hash('password123', 10);

    // Clean existing data for a fresh start
    console.log('Cleaning existing dummy data...');
    await db.query('DELETE FROM student_exams');
    await db.query('DELETE FROM exams');
    await db.query('DELETE FROM students');
    await db.query('DELETE FROM teachers');

    // 1. Seed 50 Teachers
    console.log('Seeding teachers...');
    const teacherIds = [];
    for (let i = 0; i < 50; i++) {
      const [{ insertId }] = await db.query(
        'INSERT INTO teachers (name, email, password, status) VALUES (?, ?, ?, ?)',
        [faker.person.fullName(), faker.internet.email(), passwordHash, 'approved']
      );
      teacherIds.push(insertId);
    }

    // 2. Seed 250 Students
    console.log('Seeding students...');
    const studentIds = [];
    for (let i = 0; i < 250; i++) {
      const studentId = 'STU' + faker.string.numeric(6);
      await db.query(
        'INSERT INTO students (id, name, email, password, status) VALUES (?, ?, ?, ?, ?)',
        [studentId, faker.person.fullName(), faker.internet.email(), passwordHash, 'approved']
      );
      studentIds.push(studentId);
    }

    // 3. Seed 250 Exams
    console.log('Seeding exams...');
    const examIds = [];
    for (let i = 0; i < 250; i++) {
      const teacherId = faker.helpers.arrayElement(teacherIds);
      const isLive = faker.datatype.boolean() ? 1 : 0;
      
      const [{ insertId }] = await db.query(
        'INSERT INTO exams (title, teacher_id, exam_date, duration_minutes, is_live) VALUES (?, ?, ?, ?, ?)',
        [
          faker.company.catchPhrase() + ' Exam',
          teacherId,
          faker.date.recent(),
          faker.helpers.arrayElement([30, 45, 60, 90, 120]),
          isLive
        ]
      );
      examIds.push(insertId);
    }

    // 4. Seed minimum 9-12 exams per student
    console.log('Seeding student exams (minimum 9 per student)...');
    for (const studentId of studentIds) {
      const numExams = faker.number.int({ min: 9, max: 12 });
      // Pick `numExams` unique exams for this student
      const shuffledExams = faker.helpers.shuffle(examIds).slice(0, numExams);
      
      for (const examId of shuffledExams) {
        // Randomize whether it's just 'completed' or 'started', but mostly completed to have scores
        const status = faker.helpers.arrayElement(['completed', 'completed', 'completed', 'started']);
        const score = status === 'completed' ? faker.number.int({ min: 35, max: 100 }) : null;
        const ai_grading_completed = status === 'completed' ? 1 : 0;
        
        try {
          await db.query(
            'INSERT INTO student_exams (student_id, exam_id, status, score, ai_grading_completed) VALUES (?, ?, ?, ?, ?)',
            [studentId, examId, status, score, ai_grading_completed]
          );
        } catch (err) {
          // ignore any potential duplicate key if they ever overlap (though slice(0,n) ensures no overlap)
        }
      }
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
