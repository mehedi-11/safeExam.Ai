const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '../../cheating_activity.log');

// Log a proctoring incident (YOLOv8 simulated frames or client event triggers)
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

  // Define demerit points per activity type
  let demeritPoints = 1;
  if (activityType === 'watching phone' || activityType === 'taking photo') {
    demeritPoints = 2;
  } else if (activityType === 'talking') {
    demeritPoints = 1;
  } else if (activityType === 'shortcut copy' || activityType === 'manual copy' || activityType === 'pasting answer') {
    demeritPoints = 1;
  }

  try {
    // 1. Fetch current student and exam info for logging
    const [studentRows] = await db.query('SELECT name FROM students WHERE id = ?', [studentId]);
    const [examRows] = await db.query('SELECT title FROM exams WHERE id = ?', [examId]);
    
    const studentName = studentRows.length > 0 ? studentRows[0].name : 'Unknown Student';
    const examTitle = examRows.length > 0 ? examRows[0].title : 'Unknown Exam';

    // 2. Append to physical log file
    const logTimestamp = new Date().toISOString();
    const logLine = `[${logTimestamp}] Exam: "${examTitle}" (ID: ${examId}) | Student: ${studentName} (${studentId}) engaged in cheating: ${activityType}. Details: ${details || 'None'}. Demerit Points Added: +${demeritPoints}\n`;
    
    fs.appendFile(logFilePath, logLine, (err) => {
      if (err) console.error('Error writing to cheating log file:', err);
    });

    // 3. Save to database proctoring_logs table
    await db.query(
      'INSERT INTO proctoring_logs (student_id, exam_id, activity_type, details, demerit_points, timestamp) VALUES (?, ?, ?, ?, ?, NOW())',
      [studentId, examId, activityType, details || '', demeritPoints]
    );

    // 4. Update student's active exam attempt demerit points and block status
    const [attempts] = await db.query(
      'SELECT demerit_points, status, block_until FROM student_exams WHERE student_id = ? AND exam_id = ?',
      [studentId, examId]
    );

    if (attempts.length > 0) {
      const currentAttempt = attempts[0];
      let newDemerits = currentAttempt.demerit_points + demeritPoints;
      let newStatus = currentAttempt.status;
      let newBlockUntil = currentAttempt.block_until ? new Date(currentAttempt.block_until) : null;
      const now = new Date();

      if (newDemerits >= 5) {
        // Check if student is already blocked
        if (newBlockUntil && newBlockUntil > now) {
          // If already blocked, extend block duration by 2 minutes
          newBlockUntil.setMinutes(newBlockUntil.getMinutes() + 2);
          const extensionMsg = `[${new Date().toISOString()}] Exam: "${examTitle}" (ID: ${examId}) | Student: ${studentName} (${studentId}) performed additional cheating during block. Extending block by 2 minutes. New end time: ${newBlockUntil.toISOString()}\n`;
          fs.appendFile(logFilePath, extensionMsg, (err) => {
            if (err) console.error('Error writing block extension to log file:', err);
          });
        } else {
          // Newly blocked for 5 minutes
          newBlockUntil = new Date();
          newBlockUntil.setMinutes(newBlockUntil.getMinutes() + 5);
          newStatus = 'blocked';
          const blockMsg = `[${new Date().toISOString()}] Exam: "${examTitle}" (ID: ${examId}) | Student: ${studentName} (${studentId}) exceeded 5 demerit points. Student BLOCKED from exam for 5 minutes (until ${newBlockUntil.toISOString()}).\n`;
          fs.appendFile(logFilePath, blockMsg, (err) => {
            if (err) console.error('Error writing block status to log file:', err);
          });
        }
      }

      await db.query(
        'UPDATE student_exams SET demerit_points = ?, status = ?, block_until = ? WHERE student_id = ? AND exam_id = ?',
        [newDemerits, newStatus, newBlockUntil, studentId, examId]
      );

      return res.json({
        message: 'Incident logged',
        demerit_points: newDemerits,
        status: newStatus,
        block_until: newBlockUntil
      });
    } else {
      // If student hasn't started the exam, we still log but don't update attempt status
      return res.json({ message: 'Incident logged, but student has no active exam session' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error logging incident' });
  }
};

// Fetch raw log file contents (for teachers/admins to download or view)
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

// Clear log file
exports.clearRawLogs = (req, res) => {
  fs.writeFile(logFilePath, '', (err) => {
    if (err) return res.status(500).json({ message: 'Error clearing log file' });
    return res.json({ message: 'Log file cleared' });
  });
};
