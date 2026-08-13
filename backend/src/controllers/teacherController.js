const Teacher = require('../models/Teacher');
const Exam = require('../models/Exam');
const ExamQuestion = require('../models/ExamQuestion');
const StudentExam = require('../models/StudentExam');
const StudentAnswer = require('../models/StudentAnswer');
const ProctoringLog = require('../models/ProctoringLog');
const AdminNotification = require('../models/AdminNotification');
const Student = require('../models/Student');
const bcrypt = require('bcryptjs');

// --- PROFILE MANAGEMENT ---

exports.getProfile = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id).select('id name email profile_image joining_date status');
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    const response = teacher.toObject();
    response.id = response._id;
    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching profile' });
  }
};

exports.updateProfile = async (req, res) => {
  const { name } = req.body;
  const profile_image = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const updateData = { name };
    if (profile_image) updateData.profile_image = profile_image;

    const teacher = await Teacher.findByIdAndUpdate(req.user.id, updateData, { new: true }).select('id name email profile_image joining_date status');
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    
    const response = teacher.toObject();
    response.id = response._id;
    return res.json({ message: 'Profile updated successfully', user: response });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating profile' });
  }
};

exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Old and new passwords are required' });
  }
  try {
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const isMatch = await bcrypt.compare(oldPassword, teacher.password);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect old password' });

    teacher.password = await bcrypt.hash(newPassword, 10);
    await teacher.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating password' });
  }
};

// --- EXAM MANAGEMENT ---

exports.getExams = async (req, res) => {
  try {
    const exams = await Exam.aggregate([
      { $match: { teacher_id: new (require('mongoose').Types.ObjectId)(req.user.id) } },
      { $lookup: { from: 'examquestions', localField: '_id', foreignField: 'exam_id', as: 'questions' } },
      { $lookup: { from: 'studentexams', localField: '_id', foreignField: 'exam_id', as: 'submissions' } },
      { $addFields: { questions_count: { $size: "$questions" }, submissions_count: { $size: "$submissions" } } },
      { $project: { questions: 0, submissions: 0 } },
      { $sort: { exam_date: -1 } }
    ]);
    
    const response = exams.map(e => {
      e.id = e._id;
      return e;
    });
    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching exams' });
  }
};

exports.createExam = async (req, res) => {
  const { title, duration_minutes, must_on_camera, must_on_microphone, exam_password, event_id, course_name, course_code, university_name, max_attempts } = req.body;
  if (!title || !duration_minutes) {
    return res.status(400).json({ message: 'Title and duration are required' });
  }

  try {
    const newExam = new Exam({
      title,
      duration_minutes,
      teacher_id: req.user.id,
      exam_date: new Date(),
      must_on_camera: must_on_camera ?? true,
      must_on_microphone: must_on_microphone ?? true,
      exam_password: exam_password || null,
      event_id: event_id || null,
      course_name: course_name || null,
      course_code: course_code || null,
      university_name: university_name || null,
      max_attempts: max_attempts || 1,
      total_marks: 0
    });
    // Use collection for extra fields not in schema if necessary
    await Exam.collection.insertOne(newExam.toObject());

    const notif = new AdminNotification({
      title: 'New Exam Created',
      message: `Teacher ${req.user.name} created a new exam: ${title}`
    });
    await notif.save();

    return res.status(201).json({ message: 'Exam created successfully', examId: newExam._id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error creating exam' });
  }
};

exports.updateExam = async (req, res) => {
  const { id } = req.params;
  const { title, duration_minutes, must_on_camera, must_on_microphone, exam_password, event_id, course_name, course_code, university_name, max_attempts } = req.body;
  
  if (!title || !duration_minutes) {
    return res.status(400).json({ message: 'Title and duration are required' });
  }
  
  try {
    const updateData = {
      title, duration_minutes, 
      must_on_camera: must_on_camera ?? true, 
      must_on_microphone: must_on_microphone ?? true, 
      exam_password: exam_password || null, 
      event_id: event_id || null,
      course_name: course_name || null, 
      course_code: course_code || null, 
      university_name: university_name || null, 
      max_attempts: max_attempts || 1
    };
    
    // updateOne without strict mode to allow extra fields not explicitly in schema
    const result = await Exam.collection.updateOne(
      { _id: new (require('mongoose').Types.ObjectId)(id), teacher_id: new (require('mongoose').Types.ObjectId)(req.user.id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Exam not found or unauthorized' });

    const notif = new AdminNotification({
      title: 'Exam Updated',
      message: `Teacher ${req.user.name} updated the exam: ${title}`
    });
    await notif.save();

    return res.json({ message: 'Exam updated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating exam' });
  }
};

exports.deleteExam = async (req, res) => {
  const { id } = req.params;
  try {
    const exam = await Exam.findOne({ _id: id, teacher_id: req.user.id });
    if (!exam) return res.status(404).json({ message: 'Exam not found or unauthorized' });
    
    const examTitle = exam.title;
    await Exam.deleteOne({ _id: id });
    await ExamQuestion.deleteMany({ exam_id: id });
    await StudentExam.deleteMany({ exam_id: id });
    await StudentAnswer.deleteMany({ exam_id: id });

    const notif = new AdminNotification({
      title: 'Exam Deleted',
      message: `Teacher ${req.user.name} deleted the exam: ${examTitle}`
    });
    await notif.save();

    return res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error deleting exam' });
  }
};

exports.toggleExamLive = async (req, res) => {
  const { id } = req.params;
  const { is_live, exam_password } = req.body;
  
  try {
    const exam = await Exam.findOne({ _id: id, teacher_id: req.user.id });
    if (!exam) return res.status(404).json({ message: 'Exam not found or unauthorized' });

    if (is_live) {
      const questionsCount = await ExamQuestion.countDocuments({ exam_id: id });
      if (questionsCount === 0) {
        return res.status(400).json({ message: 'Cannot make exam live. No questions have been added.', no_questions: true });
      }
    }

    exam.is_live = is_live ? true : false;
    if (is_live) exam.exam_password = exam_password;
    if (is_live) exam.exam_date = new Date();
    
    await Exam.collection.updateOne({ _id: exam._id }, { $set: exam.toObject() }); // Bypass strict

    const statusStr = is_live ? 'LIVE' : 'OFFLINE';
    const notif = new AdminNotification({
      title: 'Exam Status Changed',
      message: `Teacher ${req.user.name} changed exam status to ${statusStr}: ${exam.title}`
    });
    await notif.save();

    return res.json({ message: is_live ? 'Exam is now live!' : 'Exam is no longer live.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error toggling live status' });
  }
};

// --- QUESTION MANAGEMENT ---

exports.getQuestions = async (req, res) => {
  const { examId } = req.params;
  try {
    const exam = await Exam.findOne({ _id: examId, teacher_id: req.user.id });
    if (!exam) return res.status(403).json({ message: 'Unauthorized' });

    const questions = await ExamQuestion.find({ exam_id: examId }).sort({ sort_order: 1, _id: 1 });
    const response = questions.map(q => {
      const obj = q.toObject();
      obj.id = obj._id;
      return obj;
    });
    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching questions' });
  }
};

exports.createQuestion = async (req, res) => {
  const { exam_id, type, question_text, marks, option_a, option_b, option_c, option_d, correct_option } = req.body;
  
  if (!exam_id || !type || !question_text || !marks) {
    return res.status(400).json({ message: 'Exam ID, Type, Question Text, and Marks are required' });
  }

  try {
    const exam = await Exam.findOne({ _id: exam_id, teacher_id: req.user.id });
    if (!exam) return res.status(403).json({ message: 'Unauthorized' });

    const newQuestion = new ExamQuestion({
      exam_id,
      question_type: type, // Schema expects question_type
      question_text,
      marks
    });
    
    const obj = newQuestion.toObject();
    obj.type = type; // Support both for compatibility
    obj.option_a = option_a || null;
    obj.option_b = option_b || null;
    obj.option_c = option_c || null;
    obj.option_d = option_d || null;
    obj.correct_option = correct_option || null;

    await ExamQuestion.collection.insertOne(obj);
    
    // Update total marks in Exam
    await Exam.collection.updateOne({ _id: exam._id }, { $inc: { total_marks: marks } });

    return res.status(201).json({ message: 'Question added successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error adding question' });
  }
};

exports.updateQuestion = async (req, res) => {
  const { id } = req.params;
  const { type, question_text, marks, option_a, option_b, option_c, option_d, correct_option } = req.body;
  
  if (!type || !question_text || !marks) {
    return res.status(400).json({ message: 'Type, Question Text, and Marks are required' });
  }

  try {
    const question = await ExamQuestion.collection.findOne({ _id: new (require('mongoose').Types.ObjectId)(id) });
    if (!question) return res.status(404).json({ message: 'Question not found' });
    
    const exam = await Exam.findOne({ _id: question.exam_id, teacher_id: req.user.id });
    if (!exam) return res.status(403).json({ message: 'Unauthorized' });

    const oldMarks = question.marks;

    await ExamQuestion.collection.updateOne(
      { _id: question._id },
      { $set: { type, question_type: type, question_text, marks, option_a: option_a||null, option_b: option_b||null, option_c: option_c||null, option_d: option_d||null, correct_option: correct_option||null } }
    );
    
    // Update total marks in exam
    const diff = marks - oldMarks;
    if (diff !== 0) {
      await Exam.collection.updateOne({ _id: exam._id }, { $inc: { total_marks: diff } });
    }

    return res.json({ message: 'Question updated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating question' });
  }
};

exports.deleteQuestion = async (req, res) => {
  const { id } = req.params;
  try {
    const question = await ExamQuestion.collection.findOne({ _id: new (require('mongoose').Types.ObjectId)(id) });
    if (!question) return res.status(404).json({ message: 'Question not found' });
    
    const exam = await Exam.findOne({ _id: question.exam_id, teacher_id: req.user.id });
    if (!exam) return res.status(403).json({ message: 'Unauthorized' });

    await ExamQuestion.collection.deleteOne({ _id: question._id });
    
    await Exam.collection.updateOne({ _id: exam._id }, { $inc: { total_marks: -question.marks } });

    return res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error deleting question' });
  }
};

exports.reorderQuestions = async (req, res) => {
  const { exam_id } = req.params;
  const { ordered_ids } = req.body;

  if (!Array.isArray(ordered_ids)) {
    return res.status(400).json({ message: 'ordered_ids array is required' });
  }

  try {
    const exam = await Exam.findOne({ _id: exam_id, teacher_id: req.user.id });
    if (!exam) return res.status(404).json({ message: 'Exam not found or unauthorized' });

    for (let i = 0; i < ordered_ids.length; i++) {
      await ExamQuestion.collection.updateOne(
        { _id: new (require('mongoose').Types.ObjectId)(ordered_ids[i]), exam_id: exam._id },
        { $set: { sort_order: i } }
      );
    }

    return res.json({ message: 'Questions reordered successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error reordering questions' });
  }
};

// --- EXAM RESULTS & GRADING ---

exports.togglePublishResults = async (req, res) => {
  const { id } = req.params;
  const { results_published } = req.body;
  try {
    const exam = await Exam.findOne({ _id: id, teacher_id: req.user.id });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    await Exam.collection.updateOne({ _id: exam._id }, { $set: { results_published: results_published ? true : false } });
    return res.json({ message: 'Exam results publish status updated successfully' });
  } catch (error) {
    console.error('Error toggling publish status:', error);
    return res.status(500).json({ message: 'Server error updating publish status' });
  }
};

exports.getExamResults = async (req, res) => {
  const { id } = req.params;
  try {
    const exam = await Exam.findOne({ _id: id, teacher_id: req.user.id });
    if (!exam) return res.status(403).json({ message: 'Unauthorized' });

    const results = await StudentExam.aggregate([
      { $match: { exam_id: exam._id } },
      { $lookup: { from: 'students', localField: 'student_id', foreignField: 'id', as: 'student' } },
      { $unwind: "$student" },
      { $project: {
          student_id: 1, score: "$total_score", status: 1, started_at: 1, finished_at: "$completed_at", 
          demerit_points: 1, attempt_id: "$_id", name: "$student.name", email: "$student.email"
      }}
    ]);
    return res.json(results);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching exam results' });
  }
};

exports.downloadStudentLog = async (req, res) => {
  const { examId, studentId } = req.params;
  try {
    const exam = await Exam.findOne({ _id: examId, teacher_id: req.user.id });
    if (!exam) return res.status(403).json({ message: 'Unauthorized' });

    const logs = await ProctoringLog.find({ exam_id: examId, student_id: studentId }).sort({ timestamp: 1 });

    let logText = `AI Proctoring Log Feed\nExam: ${exam.title}\nStudent ID: ${studentId}\n-----------------------------------\n\n`;

    if (logs.length === 0) {
      logText += "No anomalies or alerts detected for this student.\n";
    } else {
      logs.forEach(log => {
        const time = new Date(log.timestamp).toLocaleString();
        logText += `[${time}] ${log.activity_type.toUpperCase()} (Points: ${log.demerit_points})\n`;
        if (log.details) logText += `Details: ${log.details}\n`;
        logText += `\n`;
      });
    }

    res.setHeader('Content-disposition', `attachment; filename=log_${examId}_${studentId}.txt`);
    res.setHeader('Content-type', 'text/plain');
    return res.send(logText);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error generating log' });
  }
};

exports.getStudentAnswersheet = async (req, res) => {
  const { examId, studentId } = req.params;
  try {
    const exam = await Exam.findOne({ _id: examId, teacher_id: req.user.id });
    if (!exam) return res.status(403).json({ message: 'Unauthorized' });

    const questions = await ExamQuestion.collection.find({ exam_id: exam._id }).toArray();
    const answers = await StudentAnswer.collection.find({ exam_id: exam._id, student_id: studentId }).toArray();
    
    const ansMap = {};
    answers.forEach(a => { ansMap[a.question_id.toString()] = a; });
    
    const rows = questions.map(eq => {
      const ans = ansMap[eq._id.toString()];
      return {
        answer_id: ans ? ans._id : null,
        student_answer: ans ? ans.answer_text : null,
        marks_awarded: ans ? ans.marks_awarded : 0,
        question_id: eq._id,
        type: eq.type || eq.question_type,
        question_text: eq.question_text,
        max_marks: eq.marks,
        option_a: eq.option_a,
        option_b: eq.option_b,
        option_c: eq.option_c,
        option_d: eq.option_d,
        correct_option: eq.correct_option
      };
    });

    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching answersheet' });
  }
};

exports.manualGradeAnswersheet = async (req, res) => {
  const { examId, studentId } = req.params;
  const { grades } = req.body;
  try {
    const exam = await Exam.findOne({ _id: examId, teacher_id: req.user.id });
    if (!exam) return res.status(403).json({ message: 'Unauthorized' });

    for (const [answer_id, marks_awarded] of Object.entries(grades)) {
      if (answer_id && answer_id !== 'null') {
        await StudentAnswer.collection.updateOne(
          { _id: new (require('mongoose').Types.ObjectId)(answer_id) },
          { $set: { marks_awarded: Number(marks_awarded) } }
        );
      }
    }
    
    const answersAgg = await StudentAnswer.aggregate([
      { $match: { exam_id: exam._id, student_id: studentId } },
      { $group: { _id: null, total: { $sum: "$marks_awarded" } } }
    ]);
    
    const finalScore = answersAgg.length > 0 ? answersAgg[0].total : 0;
    
    await StudentExam.collection.updateOne(
      { exam_id: exam._id, student_id: studentId },
      { $set: { total_score: finalScore, score: finalScore } }
    );

    return res.json({ message: 'Grades saved successfully', score: finalScore });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error saving grades' });
  }
};

// --- PROCTORING LOGS ---

exports.getProctoringLogs = async (req, res) => {
  try {
    const logs = await ProctoringLog.aggregate([
      { $lookup: { from: 'exams', localField: 'exam_id', foreignField: '_id', as: 'exam' } },
      { $unwind: "$exam" },
      { $match: { "exam.teacher_id": new (require('mongoose').Types.ObjectId)(req.user.id) } },
      { $lookup: { from: 'students', localField: 'student_id', foreignField: 'id', as: 'student' } },
      { $unwind: "$student" },
      { $project: {
          _id: 1, activity_type: 1, details: 1, demerit_points: 1, timestamp: 1,
          student_name: "$student.name", student_email: "$student.email",
          exam_title: "$exam.title", student_id: 1, exam_id: 1
      }},
      { $sort: { timestamp: -1 } }
    ]);
    const response = logs.map(l => { l.id = l._id; return l; });
    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching proctoring logs' });
  }
};

exports.getExamStudents = async (req, res) => {
  const { examId } = req.params;
  try {
    const exam = await Exam.findOne({ _id: examId, teacher_id: req.user.id });
    if (!exam) return res.status(403).json({ message: 'Unauthorized' });

    const students = await StudentExam.aggregate([
      { $match: { exam_id: exam._id } },
      { $lookup: { from: 'students', localField: 'student_id', foreignField: 'id', as: 'student' } },
      { $unwind: "$student" },
      { $project: {
          id: "$student.id", name: "$student.name", status: 1, demerit_points: 1, score: "$total_score", _id: 0
      }}
    ]);
    return res.json(students);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error retrieving exam students' });
  }
};

exports.downloadExamLogs = async (req, res) => {
  const { examId } = req.params;
  try {
    const exam = await Exam.findOne({ _id: examId, teacher_id: req.user.id });
    if (!exam) return res.status(403).json({ message: 'Unauthorized' });

    const logs = await ProctoringLog.aggregate([
      { $match: { exam_id: exam._id } },
      { $lookup: { from: 'students', localField: 'student_id', foreignField: 'id', as: 'student' } },
      { $unwind: "$student" },
      { $sort: { timestamp: -1 } }
    ]);

    let csvContent = 'Student ID,Student Name,Activity Type,Details,Timestamp\n';
    logs.forEach(log => {
      const row = [
        `"${log.student_id}"`,
        `"${log.student.name}"`,
        `"${log.activity_type}"`,
        `"${log.details}"`,
        `"${new Date(log.timestamp).toISOString()}"`
      ].join(',');
      csvContent += row + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="exam_${examId}_proctor_logs.csv"`);
    return res.send(csvContent);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error downloading logs' });
  }
};
