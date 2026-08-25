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

  let demeritPoints = req.body.overrideDemerits !== undefined ? req.body.overrideDemerits : 1;
  let isInstantBlock = req.body.forceSubmit === true;
  
  if (req.body.overrideDemerits === undefined) {
    if (activityType === 'watching phone' || activityType === 'taking photo') {
      demeritPoints = 2;
    } else if (activityType === 'talking') {
      demeritPoints = 1;
    } else if (['shortcut copy', 'manual copy', 'pasting answer', 'Tab Switching', 'Window Blur', 'Clipboard Activity', 'Shortcut Activity', 'Exit Attempt'].includes(activityType)) {
      demeritPoints = 1;
    } else if (activityType === 'AI Detection') {
      demeritPoints = 0;
      const lowerDetails = (details || '').toLowerCase();
      
      if (lowerDetails.includes('multiple persons detected')) demeritPoints += 1;
      if (lowerDetails.includes('cell phone')) isInstantBlock = true;
      if (/\bbook\b/.test(lowerDetails)) demeritPoints += 1;
      if (/\bnotebook\b/.test(lowerDetails)) demeritPoints += 1;
    }
  }

  try {
    const student = await Student.findOne({ id: studentId });
    const exam = await Exam.findById(examId).populate('event_id');
    
    const studentName = student ? student.name : (req.body.studentName || 'Unknown Student');
    const examTitle = exam ? exam.title : 'Unknown Exam';

    const logTimestamp = new Date().toISOString();
    const logLine = `[${logTimestamp}] Exam: "${examTitle}" (ID: ${examId}) | Student: ${studentName} (${studentId}) engaged in cheating: ${activityType}. Details: ${details || 'None'}. Demerit Points Added: +${demeritPoints}\n`;
    
    fs.appendFile(logFilePath, logLine, (err) => {
      if (err) console.error('Error writing to master cheating log file:', err);
    });

    // Individual Student Log File Logic
    try {
      const courseName = exam && exam.get('course_name') ? exam.get('course_name') : 'Unknown_Course';
      const courseCode = exam && exam.get('course_code') ? exam.get('course_code') : 'Unknown_Code';

      let folderType = 'exam';
      let parentName = examTitle;

      if (exam && exam.event_id) {
        folderType = 'event';
        parentName = exam.event_id.title || 'Unknown_Event';
      }

      const safeParentName = parentName.replace(/[^a-z0-9]/gi, '_');
      const safeExamTitle = examTitle.replace(/[^a-z0-9]/gi, '_');
      const safeStudentName = studentName.replace(/[^a-z0-9]/gi, '_');
      const safeCourseName = courseName.replace(/[^a-z0-9]/gi, '_');
      const safeCourseCode = courseCode.replace(/[^a-z0-9]/gi, '_');

      const baseProctoringPath = path.join(__dirname, '../../proctoring');
      const folderPath = path.join(baseProctoringPath, folderType, safeParentName);
      
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const fileName = `${safeExamTitle}-${safeCourseName}-${safeCourseCode}-${safeStudentName}-${studentId}.txt`;
      const studentLogFilePath = path.join(folderPath, fileName);

      fs.appendFileSync(studentLogFilePath, logLine);
    } catch (err) {
      console.error('Error writing to student specific log file:', err);
    }

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
      const now = new Date();

      if (isInstantBlock || newDemerits >= 20) {
        newStatus = 'completed';
        newBlockUntil = null;
        const blockReason = isInstantBlock ? 'INSTANT BLOCK AND AUTO-SUBMIT' : 'EXCEEDED 20 DEMERIT POINTS. AUTO-SUBMIT';
        const blockMsg = `[${new Date().toISOString()}] Exam: "${examTitle}" (ID: ${examId}) | Student: ${studentName} (${studentId}) - ${blockReason}.\n`;
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
