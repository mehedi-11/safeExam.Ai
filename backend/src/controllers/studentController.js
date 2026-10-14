const Student = require('../models/Student');
const Exam = require('../models/Exam');
const StudentExam = require('../models/StudentExam');
const StudentAnswer = require('../models/StudentAnswer');
const ExamQuestion = require('../models/ExamQuestion');
const Event = require('../models/Event');
const ProctoringLog = require('../models/ProctoringLog');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const geminiService = require('../services/geminiService');

// Get Profile
exports.getProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ id: req.user.id }).select('id name email status dob university address');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    return res.json(student);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching student profile' });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, dob, university, address } = req.body;
    let updateData = {};
    
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (dob) updateData.dob = dob;
    if (university) updateData.university = university;
    if (address) updateData.address = address;
    


    if (email) {
      const existing = await Student.findOne({ email, id: { $ne: req.user.id } });
      if (existing) {
        return res.status(400).json({ message: 'Email is already in use.' });
      }
    }

    const student = await Student.findOneAndUpdate({ id: req.user.id }, updateData, { new: true }).select('id name email status dob university address');
    if (!student) return res.status(404).json({ message: 'Student not found' });
    
    return res.json({ message: 'Profile updated successfully', user: student });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating profile' });
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

// --- EXAM ATTENDANCE ---

exports.getExams = async (req, res) => {
  try {
    const rawExams = await Exam.find().lean();
    const events = await Event.find().select('_id status event_date').lean();
    
    // Auto expire live exams and auto-live event exams
    const now = new Date();
    const exams = rawExams.map(exam => {
      if (!exam.is_live && exam.event_id) {
        const associatedEvent = events.find(e => e._id.toString() === exam.event_id.toString());
        if (associatedEvent && associatedEvent.status === 'live') {
          const eventDate = new Date(associatedEvent.event_date);
          if (now >= eventDate) {
            exam.is_live = true;
            exam.exam_date = eventDate;
          }
        }
      }

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
    
    const result = [];
    for (const exam of exams) {
      const attempts = studentExams.filter(se => se.exam_id && se.exam_id.toString() === exam._id.toString());
      const attemptsCount = attempts.length;

      if (attemptsCount === 0) {
        result.push({
          ...exam,
          id: exam._id,
          unique_id: exam._id.toString(),
          title: exam.title,
          attempt_id: null,
          score: null,
          started_at: null,
          finished_at: null,
          exam_status: null,
          demerit_points: 0,
          block_until: null,
          results_published: false,
          attempts: 0,
          max_attempts: exam.max_attempts || 1,
          latest_attempt_time: null
        });
      } else {
        // Sort latest attempt first (started_at descending)
        attempts.sort((a, b) => new Date(b.started_at || 0) - new Date(a.started_at || 0));
        const latest = attempts[0];

        // If an attempt is currently ongoing or blocked, prioritize it
        const activeAttempt = attempts.find(a => a.status === 'started' || a.status === 'in_progress' || a.status === 'blocked');
        const currentAttempt = activeAttempt || latest;

        const effectiveScore = (currentAttempt.total_score !== undefined && currentAttempt.total_score !== null)
          ? currentAttempt.total_score
          : currentAttempt.score;

        result.push({
          ...exam,
          id: exam._id,
          unique_id: exam._id.toString(),
          title: exam.title,
          attempt_id: currentAttempt._id,
          score: effectiveScore,
          started_at: currentAttempt.started_at,
          finished_at: currentAttempt.completed_at || currentAttempt.finished_at,
          exam_status: currentAttempt.status,
          demerit_points: currentAttempt.demerit_points || 0,
          block_until: currentAttempt.block_until,
          results_published: currentAttempt.results_published || false,
          attempts: attemptsCount,
          max_attempts: exam.max_attempts || 1,
          latest_attempt_time: currentAttempt.started_at
        });
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

    const existingAttempts = await StudentExam.find({ student_id: req.user.id, exam_id: examId }).sort({ started_at: -1 });
    
    const logStudentJoin = async (attemptNumber, isResume = false) => {
      try {
        const recentJoin = await ProctoringLog.findOne({
          student_id: req.user.id,
          exam_id: examId,
          activity_type: 'Student Join',
          timestamp: { $gte: new Date(Date.now() - 60000) }
        });
        if (!recentJoin) {
          const student = await Student.findOne({ id: req.user.id });
          const studentName = student ? student.name : 'Unknown Student';
          const detailMsg = isResume 
            ? 'Student re-entered / resumed exam session' 
            : `Student joined the exam assessment${attemptNumber > 1 ? ` (Attempt ${attemptNumber})` : ''}`;

          const joinLog = new ProctoringLog({
            student_id: req.user.id,
            student_name: studentName,
            exam_id: examId,
            activity_type: 'Student Join',
            details: detailMsg,
            demerit_points: 0
          });
          await joinLog.save();
        }
      } catch (err) {
        console.error('Error logging student join:', err);
      }
    };

    if (existingAttempts.length > 0) {
      const latest = existingAttempts[0];
      // If there's an ongoing attempt, allow resuming regardless of actualIsLive
      if (latest.status !== 'completed' && latest.status !== 'finished') {
        await logStudentJoin(latest.attempts || 1, true);
        return res.json(latest);
      }
    }

    // Checking is_live for NEW attempts
    let actualIsLive = examDetails.is_live;
    
    if (!actualIsLive && examDetails.event_id) {
      const associatedEvent = await Event.findById(examDetails.event_id);
      if (associatedEvent && associatedEvent.status === 'live') {
        const eventDate = new Date(associatedEvent.event_date);
        if (new Date() >= eventDate) {
          actualIsLive = true;
          examDetails.exam_date = eventDate; // for expiration check below
        }
      }
    }

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

    if (existingAttempts.length > 0) {
      const latest = existingAttempts[0];
      if (latest.status === 'completed' || latest.status === 'finished') {
        const attemptsCount = existingAttempts.length;
        if (attemptsCount >= max_attempts) {
          return res.status(403).json({
            message: 'You have reached the maximum number of allowed attempts for this exam.',
            limit_reached: true
          });
        }
        
        const newAttempt = new StudentExam({
          student_id: req.user.id,
          exam_id: examId,
          started_at: new Date(),
          status: 'started',
          demerit_points: 0,
          attempts: attemptsCount + 1
        });
        await newAttempt.save();
        
        await StudentAnswer.deleteMany({ student_id: req.user.id, exam_id: examId });
        await logStudentJoin(attemptsCount + 1, false);
        
        return res.json(newAttempt);
      }
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
    await logStudentJoin(1, false);

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

    const questions = await ExamQuestion.find({ exam_id: examId }).select('id type question_type marks question_text option_a option_b option_c option_d options sort_order').sort({ sort_order: 1, _id: 1 });
    const response = questions.map(q => {
      const obj = q.toObject();
      obj.id = obj._id;
      const rawQType = String(obj.type || obj.question_type || '').trim().toLowerCase();
      const qType = (rawQType === 'written' || rawQType === 'descriptive') ? 'Written' : 'MCQ';
      obj.type = qType;
      obj.question_type = qType;

      if (!obj.option_a && obj.options) {
        obj.option_a = obj.options.a || obj.options.A || '';
        obj.option_b = obj.options.b || obj.options.B || '';
        obj.option_c = obj.options.c || obj.options.C || '';
        obj.option_d = obj.options.d || obj.options.D || '';
      }
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
  const { answers, reason } = req.body;

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
        const type = String(q.type || q.question_type || '').trim().toLowerCase();
        if (type === 'mcq') {
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

    try {
      const submissionReason = reason || 'Exam submitted manually by student';
      const student = await Student.findOne({ id: req.user.id });
      const studentName = student ? student.name : 'Unknown Student';

      const submissionLog = new ProctoringLog({
        student_id: req.user.id,
        student_name: studentName,
        exam_id: examId,
        activity_type: 'Exam Submission',
        details: submissionReason,
        demerit_points: 0
      });
      await submissionLog.save();
    } catch (logErr) {
      console.error('Error logging exam submission:', logErr);
    }

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

// AI Subject Insights & Problem Diagnostic (Powered by Agent ELI)
exports.getAiInsights = async (req, res) => {
  try {
    const student = await Student.findOne({ id: req.user.id }).lean();
    const rawExams = await Exam.find().lean();
    const studentExams = await StudentExam.find({ student_id: req.user.id }).lean();

    const subjectMap = {};
    let totalDemerits = 0;

    for (const se of studentExams) {
      const exam = rawExams.find(e => e._id.toString() === se.exam_id.toString());
      if (exam) {
        const subject = (exam.course_name || exam.course_code || 'General Studies').trim();
        if (!subjectMap[subject]) {
          subjectMap[subject] = {
            subject,
            code: exam.course_code || 'GEN-101',
            totalExams: 0,
            completedExams: 0,
            scores: [],
            totalScorePercentage: 0,
            demerits: 0
          };
        }

        subjectMap[subject].totalExams++;
        totalDemerits += (se.demerit_points || 0);

        if (se.status === 'completed' && se.score !== null && se.results_published) {
          const maxMarks = exam.total_marks || 100;
          const pct = Math.round(((Number(se.score) / maxMarks) * 100) * 10) / 10;
          subjectMap[subject].completedExams++;
          subjectMap[subject].scores.push({
            title: exam.title,
            score: se.score,
            maxMarks,
            percentage: pct,
            demerits: se.demerit_points || 0
          });
          subjectMap[subject].totalScorePercentage += pct;
          subjectMap[subject].demerits += (se.demerit_points || 0);
        }
      }
    }

    const processedSubjects = Object.values(subjectMap).map(s => {
      const avgPercentage = s.completedExams > 0 
        ? Math.round((s.totalScorePercentage / s.completedExams) * 10) / 10
        : null;
      return {
        subject: s.subject,
        code: s.code,
        completedExams: s.completedExams,
        totalExams: s.totalExams,
        averagePercentage: avgPercentage,
        demerits: s.demerits,
        exams: s.scores
      };
    });

    const aiAnalysis = await geminiService.analyzeStudentPerformance({
      studentName: student?.name || req.user.name,
      subjects: processedSubjects,
      totalDemerits
    });

    return res.json({
      success: true,
      analysis: aiAnalysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("AI Insights Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Error generating AI insights' 
    });
  }
};
