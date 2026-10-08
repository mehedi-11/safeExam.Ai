const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const path = require('path');
const { faker } = require('@faker-js/faker');

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '.env') });

const Teacher = require('./src/models/Teacher');
const Student = require('./src/models/Student');
const Exam = require('./src/models/Exam');
const ExamQuestion = require('./src/models/ExamQuestion');
const StudentExam = require('./src/models/StudentExam');

async function seedData() {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI not found in .env");
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB...");

        const passwordHash = await bcrypt.hash('password123', 10);
        const runId = Date.now().toString().slice(-4); // To avoid email conflicts

        // 1. Create Teachers
        console.log("Creating 100 teachers...");
        const teachersToInsert = [];
        for(let i=1; i<=100; i++) {
            const teacherName = faker.person.fullName();
            teachersToInsert.push({
                name: teacherName,
                email: faker.internet.email({ firstName: teacherName }),
                password: passwordHash,
                university: "Test University",
                status: 'active'
            });
        }
        const teachers = await Teacher.insertMany(teachersToInsert);

        // 2. Create Students
        console.log("Creating 500 students...");
        const studentsToInsert = [];
        
        // Ensure 232004048 is processed
        let specificStudent = await Student.findOne({ id: '232004048' });
        if (!specificStudent) {
            specificStudent = new Student({
                id: '232004048',
                name: 'Specific Student',
                email: `232004048_${runId}@student.example.com`,
                password: passwordHash,
                university: "Test University",
                status: 'active'
            });
            await specificStudent.save();
        }
        
        for(let i=1; i<=499; i++) {
            const studentName = faker.person.fullName();
            studentsToInsert.push({
                id: `STD${runId}${i}`,
                name: studentName,
                email: faker.internet.email({ firstName: studentName }),
                password: passwordHash,
                university: "Test University",
                status: 'active'
            });
        }
        const createdStudents = await Student.insertMany(studentsToInsert);
        const allStudents = [specificStudent, ...createdStudents];

        // 3. Create Exams & Questions
        console.log("Creating exams and questions...");
        const allExams = [];
        
        for (let teacher of teachers) {
            const numExams = Math.floor(Math.random() * (20 - 13 + 1)) + 13; // 13 to 20
            
            for (let i = 0; i < numExams; i++) {
                const exam = new Exam({
                    teacher_id: teacher._id,
                    title: `Exam ${i+1} by ${teacher.name}`,
                    exam_date: new Date(Date.now() + Math.random() * 10000000000), // Random future date
                    duration_minutes: 60,
                    total_marks: 50,
                    is_live: Math.random() > 0.5,
                    max_attempts: 1,
                    course_name: `Course ${i+1}`
                });
                await exam.save();
                allExams.push(exam);

                const questions = [];
                for(let q=1; q<=5; q++) {
                    questions.push({
                        exam_id: exam._id,
                        question_text: `Sample Question ${q} for ${exam.title}?`,
                        question_type: 'mcq',
                        options: {
                            a: "Option A",
                            b: "Option B",
                            c: "Option C",
                            d: "Option D"
                        },
                        correct_answer: 'a',
                        marks: 10
                    });
                }
                await ExamQuestion.insertMany(questions);
            }
        }

        // 4. Students taking exams
        console.log(`Assigning exams to ${allStudents.length} students...`);
        const studentExamsToInsert = [];
        for (let student of allStudents) {
            const numExamsToTake = Math.floor(Math.random() * 10) + 1; // 1 to 10 exams per student
            // pick random exams efficiently
            const shuffledExams = [...allExams].sort(() => 0.5 - Math.random());
            const selectedExams = shuffledExams.slice(0, numExamsToTake);
            
            for(let exam of selectedExams) {
                studentExamsToInsert.push({
                    student_id: student.id,
                    exam_id: exam._id,
                    status: 'completed',
                    total_score: Math.floor(Math.random() * 51), // 0 to 50
                    started_at: new Date(),
                    completed_at: new Date(),
                    results_published: true
                });
            }
        }
        
        // Chunk inserts for StudentExam to avoid large payload errors
        const chunkSize = 1000;
        let insertedExams = 0;
        for (let i = 0; i < studentExamsToInsert.length; i += chunkSize) {
            const chunk = studentExamsToInsert.slice(i, i + chunkSize);
            await StudentExam.insertMany(chunk);
            insertedExams += chunk.length;
            console.log(`Inserted ${insertedExams}/${studentExamsToInsert.length} student exams...`);
        }

        console.log("Data seeding complete!");
        process.exit(0);

    } catch(err) {
        console.error("Error during seeding:", err);
        process.exit(1);
    }
}

seedData();
