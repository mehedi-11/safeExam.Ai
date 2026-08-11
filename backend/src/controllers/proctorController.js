const fs = require('fs');
const path = require('path');
const ProctoringLog = require('../models/ProctoringLog');
const Student = require('../models/Student');
const Exam = require('../models/Exam');
const StudentExam = require('../models/StudentExam');

const logFilePath = path.join(__dirname, '../../cheating_activity.log');

// Log a proctoring incident
exports.logIncident = async (req, res) => {
  const { examId, activityType, details } = req.body;
  let studentId = req.body.studentId;

  // Security check: Use the authenticated user's ID if the requester is a student
  if (req.user && req.user.role === 'student') {
    studentId = req.user.id; // Wait, student ID might be the custom 'id' field, not _id. req.user.id in JWT is usually the custom student ID. I used student.id in authController.
  }

  if (!examId || !studentId || !activityType) {
    return res.status(400).json({ message: 'examId, studentId, and activityType are required' });
  }

  let demeritPoints = 1;
  let isInstantBlock = false;
  
  if (activityType === 'watching phone' || activityType === 'taking photo') {
    demeritPoints = 2;
  } else if (activityType === 'talking') {
    demeritPoints = 1;
  } else if (['shortcut copy', 'manual copy', 'pasting answer', 'Tab Switching', 'Window Blur', 'Clipboard Activity', 'Shortcut Activity'].includes(activityType)) {
    demeritPoints = 1;
  } else if (activityType === 'AI Detection') {
    demeritPoints = 0;
    const lowerDetails = (details || '').toLowerCase();
    
    if (lowerDetails.includes('multiple persons detected')) demeritPoints += 1;
    if (lowerDetails.includes('cell phone')) isInstantBlock = true;
    if (/\bbook\b/.test(lowerDetails)) demeritPoints += 1;
    if (/\bnotebook\b/.test(lowerDetails)) demeritPoints += 1;
  }

  try {
    const student = await Student.findOne({ id: studentId });
    const exam = await Exam.findById(examId);
    
    const studentName = student ? student.name : 'Unknown Student';
    const examTitle = exam ? exam.title : 'Unknown Exam';

    const logTimestamp = new Date().toISOString();
    const logLine = `[${logTimestamp}] Exam: "${examTitle}" (ID: ${examId}) | Student: ${studentName} (${studentId}) engaged in cheating: ${activityType}. Details: ${details || 'None'}. Demerit Points Added: +${demeritPoints}\n`;
    
    fs.appendFile(logFilePath, logLine, (err) => {
      if (err) console.error('Error writing to cheating log file:', err);
    });

    const newLog = new ProctoringLog({
      student_id: studentId,
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
      const now = new Date();

      if (isInstantBlock) {
        newStatus = 'completed';
        newBlockUntil = null;
        const blockMsg = `[${new Date().toISOString()}] Exam: "${examTitle}" (ID: ${examId}) | Student: ${studentName} (${studentId}) used a MOBILE PHONE. INSTANT BLOCK AND AUTO-SUBMIT.\n`;
        fs.appendFile(logFilePath, blockMsg, (err) => {
          if (err) console.error('Error writing block status to log file:', err);
        });
        currentAttempt.demerit_points = newDemerits;
        currentAttempt.status = newStatus;
        currentAttempt.block_until = newBlockUntil;
        currentAttempt.finished_at = new Date();
        currentAttempt.completed_at = new Date();
        await currentAttempt.save();
      } else {
        if (newDemerits >= 5) {
          if (newBlockUntil && newBlockUntil > now) {
            newBlockUntil.setMinutes(newBlockUntil.getMinutes() + 2);
            const extensionMsg = `[${new Date().toISOString()}] Exam: "${examTitle}" (ID: ${examId}) | Student: ${studentName} (${studentId}) performed additional cheating during block. Extending block by 2 minutes. New end time: ${newBlockUntil.toISOString()}\n`;
            fs.appendFile(logFilePath, extensionMsg, (err) => {
              if (err) console.error('Error writing block extension to log file:', err);
            });
          } else {
            newBlockUntil = new Date();
            newBlockUntil.setMinutes(newBlockUntil.getMinutes() + 5);
            newStatus = 'blocked';
            const blockMsg = `[${new Date().toISOString()}] Exam: "${examTitle}" (ID: ${examId}) | Student: ${studentName} (${studentId}) exceeded 5 demerit points. Student BLOCKED from exam for 5 minutes (until ${newBlockUntil.toISOString()}).\n`;
            fs.appendFile(logFilePath, blockMsg, (err) => {
              if (err) console.error('Error writing block status to log file:', err);
            });
          }
        }

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

exports.getRawLogs = (req, res) => {
  fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.json({ logs: 'No cheating logs recorded yet.' });
      }
      return res.status(500).json({ message: 'Error reading log file' });
    }
    return res.json({ logs: data });
  });
};

exports.clearRawLogs = (req, res) => {
  fs.writeFile(logFilePath, '', (err) => {
    if (err) return res.status(500).json({ message: 'Error clearing log file' });
    return res.json({ message: 'Log file cleared' });
  });
};
