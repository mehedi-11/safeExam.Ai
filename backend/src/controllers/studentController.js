const Student = require('../models/Student');
const Exam = require('../models/Exam');
const StudentExam = require('../models/StudentExam');
const StudentAnswer = require('../models/StudentAnswer');
const ExamQuestion = require('../models/ExamQuestion');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Get Profile
exports.getProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ id: req.user.id }).select('id name email profile_image status');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    return res.json(student);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching student profile' });
  }
};

// Change Password Only
exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Old and new passwords are required' });
  }
  try {
    const student = await Student.findOne({ id: req.user.id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const isMatch = await bcrypt.compare(oldPassword, student.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect old password' });
    }

    student.password = await bcrypt.hash(newPassword, 10);
    await student.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating password' });
  }
};

// Get Enrolled Courses (Skipped/Mocked for MongoDB Migration since courses were legacy)
exports.getCourses = async (req, res) => {
  try {
    // Legacy support: returning empty array if courses are not migrated
    return res.json([]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching enrolled courses' });
  }
};

exports.getAvailableCourses = async (req, res) => {
  try {
    return res.json([]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching available courses' });
  }
};

exports.requestEnrollment = async (req, res) => {
  return res.status(400).json({ message: 'Course enrollment is disabled in this version' });
};

// --- EXAM ATTENDANCE ---

exports.getExams = async (req, res) => {
  try {
    const rawExams = await Exam.find().lean();
    
    // Auto expire live exams
    const now = new Date();
    const exams = rawExams.map(exam => {
      if (exam.is_live) {
        const examDate = new Date(exam.exam_date);
        const durationMs = (exam.duration_minutes + 5) * 60000;
        const expireTime = new Date(examDate.getTime() + durationMs);
        if (now > expireTime) {
          exam.is_live = false;
        }
      }
      return exam;
    });

    const studentExams = await StudentExam.find({ student_id: req.user.id }).lean();
    
    const examsMap = new Map();
    const result = [];
    
    // Process attempted exams
    for (const se of studentExams) {
      const exam = exams.find(e => e._id.toString() === se.exam_id.toString());
      if (exam) {
        let count = examsMap.get(exam._id.toString()) || 0;
        count++;
        examsMap.set(exam._id.toString(), count);
        
        let title = exam.title;
        if (count > 1) title = `${exam.title} (${count})`;
        
        result.push({
          ...exam,
          id: exam._id,
          unique_id: `${exam._id}-${se._id}`,
          title: title,
          attempt_id: se._id,
          score: se.total_score || se.score,
          started_at: se.started_at,
          finished_at: se.completed_at || se.finished_at,
          exam_status: se.status,
          demerit_points: se.demerit_points,
          block_until: se.block_until,
          results_published: se.results_published || false,
          attempts: se.attempts || 1,
          latest_attempt_time: se.started_at
        });
      }
    }

    // Process unattempted exams
    for (const exam of exams) {
      const attempts = studentExams.filter(se => se.exam_id.toString() === exam._id.toString());
      if (attempts.length === 0) {
        result.push({
          ...exam,
          id: exam._id,
          unique_id: `${exam._id}-0`
        });
      } else {
        // Find latest attempt
        const latestAttempt = attempts.sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0];
        if (exam.is_live && new Date(latestAttempt.started_at) < new Date(exam.exam_date)) {
          const nextCount = (examsMap.get(exam._id.toString()) || 0) + 1;
          result.push({
            ...exam,
            id: exam._id,
            unique_id: `${exam._id}-new`,
            title: nextCount > 1 ? `${exam.title} (${nextCount})` : exam.title,
            attempt_id: null,
            score: null,
            started_at: null,
            finished_at: null,
            exam_status: null,
            demerit_points: null,
            block_until: null,
            attempts: null
          });
        }
      }
    }

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching exams' });
  }
};

exports.startExam = async (req, res) => {
  const { examId } = req.params;
  const { exam_password } = req.body;
  try {
    const examDetails = await Exam.findById(examId);
    if (!examDetails) return res.status(404).json({ message: 'Exam not found' });

    let actualIsLive = examDetails.is_live;
    if (actualIsLive) {
      const examDate = new Date(examDetails.exam_date);
      const durationMs = (examDetails.duration_minutes + 5) * 60000;
      const expireTime = new Date(examDate.getTime() + durationMs);
      if (new Date() > expireTime) {
        actualIsLive = false;
      }
    }

    if (actualIsLive) {
      if (!exam_password || exam_password !== examDetails.exam_password) {
        return res.status(403).json({ message: 'Invalid or missing exam password.' });
      }
    } else {
       return res.status(403).json({ message: 'This exam is not currently live or has expired.' });
    }

    const max_attempts = examDetails.max_attempts || 1;

    const existingAttempts = await StudentExam.find({ student_id: req.user.id, exam_id: examId }).sort({ started_at: -1 });

    if (existingAttempts.length > 0) {
      const latest = existingAttempts[0];
      if (latest.status === 'completed' || latest.status === 'finished') {
        const attempts = latest.attempts || 1;
        
        const newAttempt = new StudentExam({
          student_id: req.user.id,
          exam_id: examId,
          started_at: new Date(),
          status: 'started',
          demerit_points: 0,
          attempts: attempts + 1
        });
        await newAttempt.save();
        
        await StudentAnswer.deleteMany({ student_id: req.user.id, exam_id: examId });
        
        return res.json(newAttempt);
      }
      return res.json(latest);
    }

    const newAttempt = new StudentExam({
      student_id: req.user.id,
      exam_id: examId,
      started_at: new Date(),
      status: 'started',
      demerit_points: 0,
      attempts: 1
    });
    await newAttempt.save();

    return res.status(201).json(newAttempt);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error starting exam' });
  }
};

exports.getExamQuestions = async (req, res) => {
  const { examId } = req.params;
  try {
    const attempts = await StudentExam.find({ student_id: req.user.id, exam_id: examId }).sort({ started_at: -1 });
    if (attempts.length === 0) return res.status(400).json({ message: 'Exam session has not been started' });

    const attempt = attempts[0];
    if (attempt.status === 'completed' || attempt.status === 'finished') {
      return res.status(400).json({ message: 'You have already completed this exam' });
    }

    if (attempt.block_until && new Date(attempt.block_until) > new Date()) {
      return res.status(403).json({
        message: 'Exam is currently locked due to proctoring block',
        block_until: attempt.block_until
      });
    }

    const questions = await ExamQuestion.find({ exam_id: examId }).select('id type question_type marks question_text option_a option_b option_c option_d sort_order').sort({ sort_order: 1, _id: 1 });
    const response = questions.map(q => {
      const obj = q.toObject();
      obj.id = obj._id;
      obj.type = obj.type || obj.question_type;
      return obj;
    });

    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error retrieving questions' });
  }
};

exports.getSavedAnswers = async (req, res) => {
  const { examId } = req.params;
  try {
    const answers = await StudentAnswer.find({ student_id: req.user.id, exam_id: examId });
    const answersMap = {};
    answers.forEach(a => answersMap[a.question_id.toString()] = a.answer_text || a.student_answer);
    return res.json(answersMap);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error retrieving saved answers' });
  }
};

exports.autoSaveExam = async (req, res) => {
  const { examId } = req.params;
  const { answers } = req.body;

  try {
    const attempts = await StudentExam.find({ student_id: req.user.id, exam_id: examId }).sort({ started_at: -1 });
    if (attempts.length === 0) return res.status(400).json({ message: 'No active exam session' });

    const attempt = attempts[0];
    if (attempt.status === 'completed' || attempt.status === 'finished') return res.status(400).json({ message: 'Exam already submitted' });

    const examDetails = await Exam.findById(examId);
    if (examDetails && examDetails.duration_minutes) {
      const durationSec = examDetails.duration_minutes * 60;
      const elapsedSec = Math.floor((new Date() - new Date(attempt.started_at)) / 1000);
      if (elapsedSec > durationSec + 120) {
        return res.status(400).json({ message: 'Exam time has expired' });
      }
    }

    for (const [qId, ans] of Object.entries(answers)) {
      if (!ans) continue;
      await StudentAnswer.findOneAndUpdate(
        { student_id: req.user.id, exam_id: examId, question_id: qId },
        { student_answer: ans, answer_text: ans },
        { upsert: true }
      );
    }

    return res.json({ message: 'Auto-saved successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error during auto-save' });
  }
};

exports.submitExam = async (req, res) => {
  const { examId } = req.params;
  const { answers } = req.body;

  try {
    const attempts = await StudentExam.find({ student_id: req.user.id, exam_id: examId }).sort({ started_at: -1 });
    if (attempts.length === 0) return res.status(400).json({ message: 'No active exam session' });

    const attempt = attempts[0];
    if (attempt.status === 'completed' || attempt.status === 'finished') return res.status(400).json({ message: 'Exam already submitted' });

    const questions = await ExamQuestion.find({ exam_id: examId });
    let totalScore = 0;
    let pendingManualReview = false;

    for (let q of questions) {
      const studentAnswer = answers[q._id.toString()];
      let marksAwarded = null; 

      if (studentAnswer) {
        const type = q.type || q.question_type;
        if (type.toUpperCase() === 'MCQ') {
          if (studentAnswer.toUpperCase() === (q.correct_option || q.correct_answer || '').toUpperCase()) {
            marksAwarded = q.marks;
            totalScore += q.marks;
          } else {
            marksAwarded = 0;
          }
        } else {
          pendingManualReview = true;
          marksAwarded = null; 
        }
      } else {
        marksAwarded = 0; 
      }

      await StudentAnswer.findOneAndUpdate(
        { student_id: req.user.id, exam_id: examId, question_id: q._id },
        { student_answer: studentAnswer || '', answer_text: studentAnswer || '', marks_awarded: marksAwarded },
        { upsert: true }
      );
    }

    attempt.total_score = pendingManualReview ? null : totalScore;
    attempt.score = pendingManualReview ? null : totalScore;
    attempt.completed_at = new Date();
    attempt.finished_at = new Date();
    attempt.status = 'completed';
    await attempt.save();

    return res.json({ 
      message: 'Exam submitted successfully', 
      score: pendingManualReview ? 'Pending Review' : totalScore,
      pendingManualReview 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error submitting exam' });
  }
};
