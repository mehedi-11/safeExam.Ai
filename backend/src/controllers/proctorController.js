const ProctoringLog = require('../models/ProctoringLog');
const Student = require('../models/Student');
const Exam = require('../models/Exam');
const StudentExam = require('../models/StudentExam');

// Log a proctoring incident - 100% Database Driven (MongoDB)
exports.logIncident = async (req, res) => {
  const { examId, activityType, details } = req.body;
  let studentId = req.body.studentId;

  // Security check: Use the authenticated user's ID if the requester is a student
  if (req.user && req.user.role === 'student') {
    studentId = req.user.id;
  }

  if (!examId || !studentId || !activityType) {
    return res.status(400).json({ message: 'examId, studentId, and activityType are required' });
  }

  let demeritPoints = req.body.overrideDemerits !== undefined ? req.body.overrideDemerits : 1;
  let isInstantBlock = req.body.forceSubmit === true;
  
  if (req.body.overrideDemerits === undefined) {
    if (activityType === 'talking') {
      demeritPoints = 1; // Talking / Speech: +1
    } else if (['Tab Switching', 'Window Blur', 'Tab Switching / Window Blur'].includes(activityType)) {
      demeritPoints = 2; // Tab Switch / Screen Blur / Minimize: +2
    } else if (['shortcut copy', 'manual copy', 'pasting answer', 'Clipboard Activity', 'Shortcut Activity', 'Exit Attempt'].includes(activityType)) {
      demeritPoints = 1; // Copy / Paste / Cut / Select all shortcuts: +1
    } else if (activityType === 'AI Detection') {
      demeritPoints = 0; // Object detection has NO demerit points!
    } else {
      demeritPoints = 1;
    }
  }

  try {
    const student = await Student.findOne({ id: studentId });
    const exam = await Exam.findById(examId);
    
    const studentName = student ? student.name : (req.body.studentName || 'Unknown Student');

    // 1. Save violation event to MongoDB
    const newLog = new ProctoringLog({
      student_id: studentId,
      student_name: studentName,
      exam_id: examId,
      activity_type: activityType,
      details: details || '',
      demerit_points: demeritPoints
    });
    await newLog.save();

    const attempts = await StudentExam.find({ student_id: studentId, exam_id: examId }).sort({ started_at: -1 });

    if (attempts.length > 0) {
      const currentAttempt = attempts[0];
      let newDemerits = (currentAttempt.demerit_points || 0) + demeritPoints;
      let newStatus = currentAttempt.status;
      let newBlockUntil = currentAttempt.block_until ? new Date(currentAttempt.block_until) : null;

      if (isInstantBlock || newDemerits >= 5) {
        newStatus = 'completed';
        newBlockUntil = null;
        currentAttempt.demerit_points = newDemerits;
        currentAttempt.status = newStatus;
        currentAttempt.block_until = newBlockUntil;
        currentAttempt.finished_at = new Date();
        currentAttempt.completed_at = new Date();
        await currentAttempt.save();

        try {
          const submissionReason = isInstantBlock
            ? `Auto-Submitted: ${details || activityType}`
            : 'Auto-Submitted: Demerit points reached threshold (5+ points)';

          const submissionLog = new ProctoringLog({
            student_id: studentId,
            student_name: studentName,
            exam_id: examId,
            activity_type: 'Exam Submission',
            details: submissionReason,
            demerit_points: 0
          });
          await submissionLog.save();
        } catch (logErr) {
          console.error('Error saving submission log in proctor controller:', logErr);
        }
      } else {
        currentAttempt.demerit_points = newDemerits;
        currentAttempt.status = newStatus;
        currentAttempt.block_until = newBlockUntil;
        await currentAttempt.save();
      }

      return res.json({
        message: 'Incident logged',
        demerit_points: newDemerits,
        status: newStatus,
        block_until: newBlockUntil
      });
    } else {
      return res.json({ message: 'Incident logged, but student has no active exam session' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error logging incident' });
  }
};

// Retrieve formatted raw logs from MongoDB (Zero filesystem dependencies)
exports.getRawLogs = async (req, res) => {
  try {
    const logs = await ProctoringLog.find().sort({ timestamp: -1 }).limit(100);
    if (!logs || logs.length === 0) {
      return res.json({ logs: 'No cheating logs recorded yet.' });
    }
    const logText = logs.map(l => {
      const time = new Date(l.timestamp).toISOString();
      return `[${time}] Student: ${l.student_name} (${l.student_id}) - ${l.activity_type}. Details: ${l.details || 'None'}. Demerit Points: ${l.demerit_points}`;
    }).join('\n');
    return res.json({ logs: logText });
  } catch (err) {
    console.error('Error reading proctoring logs:', err);
    return res.status(500).json({ message: 'Error reading proctoring logs' });
  }
};

// Clear raw logs from database
exports.clearRawLogs = async (req, res) => {
  try {
    await ProctoringLog.deleteMany({});
    return res.json({ message: 'Proctoring logs cleared successfully from database' });
  } catch (err) {
    console.error('Error clearing proctoring logs:', err);
    return res.status(500).json({ message: 'Error clearing proctoring logs' });
  }
};
