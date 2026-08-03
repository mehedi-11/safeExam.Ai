const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Get Profile
exports.getProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, profile_image, status FROM students WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    return res.json(rows[0]);
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
    const [rows] = await db.query('SELECT password FROM students WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const student = rows[0];
    const isMatch = await bcrypt.compare(oldPassword, student.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect old password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE students SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating password' });
  }
};

// Get Enrolled Courses
exports.getCourses = async (req, res) => {
  try {
    const query = `
      SELECT c.*, ce.status AS enrollment_status
      FROM courses c
      JOIN course_enrollments ce ON c.id = ce.course_id
      WHERE ce.student_id = ? AND ce.status = 'approved'
    `;
    const [rows] = await db.query(query, [req.user.id]);
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching enrolled courses' });
  }
};

// Get All Courses with enrollment status for student
exports.getAvailableCourses = async (req, res) => {
  try {
    const query = `
      SELECT c.*, 
             ce.status AS enrollment_status,
             t.name AS teacher_name
      FROM courses c
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.student_id = ?
      LEFT JOIN course_assignments ca ON c.id = ca.course_id
      LEFT JOIN teachers t ON ca.teacher_id = t.id
    `;
    const [rows] = await db.query(query, [req.user.id]);
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching available courses' });
  }
};

// Request Course Enrollment (Status = 'pending')
exports.requestEnrollment = async (req, res) => {
  const { courseId } = req.body;
  if (!courseId) {
    return res.status(400).json({ message: 'Course ID is required' });
  }
  try {
    // Check if course exists
    const [course] = await db.query('SELECT id FROM courses WHERE id = ?', [courseId]);
    if (course.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if already enrolled or requested
    const [existing] = await db.query(
      'SELECT status FROM course_enrollments WHERE course_id = ? AND student_id = ?',
      [courseId, req.user.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: `Enrollment status is already: ${existing[0].status}` });
    }

    await db.query(
      "INSERT INTO course_enrollments (course_id, student_id, status) VALUES (?, ?, 'pending')",
      [courseId, req.user.id]
    );

    return res.status(201).json({ message: 'Enrollment request sent successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error requesting enrollment' });
  }
};

// --- EXAM ATTENDANCE ---

// Get list of exams available
exports.getExams = async (req, res) => {
  try {
    const query = `
      SELECT e.*,
             se.score, se.started_at, se.finished_at, se.status AS exam_status,
             se.demerit_points, se.block_until
      FROM exams e
      LEFT JOIN student_exams se ON e.id = se.exam_id AND se.student_id = ?
    `;
    const [rows] = await db.query(query, [req.user.id]);
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching exams' });
  }
};

exports.startExam = async (req, res) => {
  const { examId } = req.params;
  const { exam_password } = req.body;
  try {
    // Verify exam exists and check password
    const [examDetails] = await db.query('SELECT is_live, exam_password, max_attempts FROM exams WHERE id = ?', [examId]);
    
    if (examDetails.length === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (examDetails[0].is_live) {
      if (!exam_password || exam_password !== examDetails[0].exam_password) {
        return res.status(403).json({ message: 'Invalid or missing exam password.' });
      }
    } else {
       return res.status(403).json({ message: 'This exam is not currently live.' });
    }

    const max_attempts = examDetails[0].max_attempts || 1;

    // Check if exam is already started/completed
    const [existing] = await db.query(
      'SELECT * FROM student_exams WHERE student_id = ? AND exam_id = ?',
      [req.user.id, examId]
    );

    if (existing.length > 0) {
      if (existing[0].status === 'completed') {
        const attempts = existing[0].attempts || 1;
        if (attempts >= max_attempts) {
           return res.status(403).json({ message: 'You have already reached the maximum attempts allowed for this exam', limit_reached: true });
        } else {
           // Allow new attempt: Reset status to 'started', increment attempts, delete old answers
           await db.query('UPDATE student_exams SET status = ?, attempts = attempts + 1, score = NULL, started_at = ? WHERE student_id = ? AND exam_id = ?', ['started', new Date(), req.user.id, examId]);
           await db.query('DELETE FROM student_answers WHERE student_id = ? AND exam_id = ?', [req.user.id, examId]);
           existing[0].status = 'started';
           existing[0].attempts = attempts + 1;
           return res.json(existing[0]);
        }
      }
      return res.json(existing[0]); // Return active session
    }

    // Create new exam attempt
    const newAttempt = {
      student_id: req.user.id,
      exam_id: examId,
      started_at: new Date(),
      status: 'started',
      demerit_points: 0,
      attempts: 1
    };

    try {
      await db.query(
        'INSERT INTO student_exams (student_id, exam_id, started_at, status, demerit_points, attempts) VALUES (?, ?, ?, ?, ?, ?)',
        [newAttempt.student_id, newAttempt.exam_id, newAttempt.started_at, newAttempt.status, newAttempt.demerit_points, newAttempt.attempts]
      );
    } catch (insertError) {
      if (insertError.code === 'ER_DUP_ENTRY') {
        const [existing] = await db.query(
          'SELECT * FROM student_exams WHERE student_id = ? AND exam_id = ?',
          [req.user.id, examId]
        );
        return res.json(existing[0]);
      }
      throw insertError;
    }

    return res.status(201).json(newAttempt);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error starting exam' });
  }
};

// Get active exam questions (only if exam started and not completed/blocked)
exports.getExamQuestions = async (req, res) => {
  const { examId } = req.params;
  try {
    const [attempt] = await db.query(
      'SELECT status, block_until FROM student_exams WHERE student_id = ? AND exam_id = ?',
      [req.user.id, examId]
    );

    if (attempt.length === 0) {
      return res.status(400).json({ message: 'Exam session has not been started' });
    }

    if (attempt[0].status === 'completed') {
      return res.status(400).json({ message: 'You have already completed this exam' });
    }

    // Check if currently blocked
    if (attempt[0].block_until && new Date(attempt[0].block_until) > new Date()) {
      return res.status(403).json({
        message: 'Exam is currently locked due to proctoring block',
        block_until: attempt[0].block_until
      });
    }

    // Return questions (without correct option for security!)
    const [questions] = await db.query(
      'SELECT id, type, marks, question_text, option_a, option_b, option_c, option_d FROM exam_questions WHERE exam_id = ?',
      [examId]
    );

    return res.json(questions);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error retrieving questions' });
  }
};

// Fetch saved answers for an ongoing exam
exports.getSavedAnswers = async (req, res) => {
  const { examId } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT question_id, student_answer FROM student_answers WHERE student_id = ? AND exam_id = ?',
      [req.user.id, examId]
    );
    const answersMap = {};
    rows.forEach(r => answersMap[r.question_id] = r.student_answer);
    return res.json(answersMap);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error retrieving saved answers' });
  }
};

// Auto Save Exam Answers
exports.autoSaveExam = async (req, res) => {
  const { examId } = req.params;
  const { answers } = req.body; // Map: { questionId: student_answer }

  try {
    const [attempt] = await db.query(
      'SELECT status, started_at FROM student_exams WHERE student_id = ? AND exam_id = ?',
      [req.user.id, examId]
    );

    if (attempt.length === 0) return res.status(400).json({ message: 'No active exam session' });
    if (attempt[0].status === 'completed') return res.status(400).json({ message: 'Exam already submitted' });

    // Enforce time limit if strict
    const [examDetails] = await db.query('SELECT duration_minutes FROM exams WHERE id = ?', [examId]);
    if (examDetails.length > 0) {
      const durationSec = examDetails[0].duration_minutes * 60;
      const elapsedSec = Math.floor((new Date() - new Date(attempt[0].started_at)) / 1000);
      if (elapsedSec > durationSec + 120) {
        // 120 seconds grace period
        return res.status(400).json({ message: 'Exam time has expired' });
      }
    }

    // Save answers
    for (const [qId, ans] of Object.entries(answers)) {
      if (!ans) continue;
      
      const [existing] = await db.query(
        'SELECT id FROM student_answers WHERE student_id = ? AND exam_id = ? AND question_id = ?',
        [req.user.id, examId, qId]
      );

      if (existing.length > 0) {
        await db.query(
          'UPDATE student_answers SET student_answer = ? WHERE id = ?',
          [ans, existing[0].id]
        );
      } else {
        await db.query(
          'INSERT INTO student_answers (student_id, exam_id, question_id, student_answer) VALUES (?, ?, ?, ?)',
          [req.user.id, examId, qId, ans]
        );
      }
    }

    return res.json({ message: 'Auto-saved successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error during auto-save' });
  }
};

// Submit exam answers and calculate score
exports.submitExam = async (req, res) => {
  const { examId } = req.params;
  const { answers } = req.body; // Map: { questionId: student_answer }

  try {
    const [attempt] = await db.query(
      'SELECT status FROM student_exams WHERE student_id = ? AND exam_id = ?',
      [req.user.id, examId]
    );

    if (attempt.length === 0) {
      return res.status(400).json({ message: 'No active exam session' });
    }

    if (attempt[0].status === 'completed') {
      return res.status(400).json({ message: 'Exam already submitted' });
    }

    // Enforce strict time limit
    const [examDetails] = await db.query('SELECT duration_minutes FROM exams WHERE id = ?', [examId]);
    if (examDetails.length > 0) {
      const durationSec = examDetails[0].duration_minutes * 60;
      const elapsedSec = Math.floor((new Date() - new Date(attempt[0].started_at)) / 1000);
      if (elapsedSec > durationSec + 120) {
        // Just log or block depending on policy
        console.log(`Student ${req.user.id} submitted exam ${examId} late by ${elapsedSec - durationSec} seconds.`);
      }
    }

    // Get questions with correct answers
    const [questions] = await db.query(
      'SELECT id, type, correct_option, marks FROM exam_questions WHERE exam_id = ?',
      [examId]
    );

    let totalScore = 0;
    let pendingManualReview = false;

    for (let q of questions) {
      const studentAnswer = answers[q.id];
      let marksAwarded = null; // NULL means pending grading

      if (studentAnswer) {
        if (q.type === 'MCQ') {
          if (studentAnswer.toUpperCase() === q.correct_option.toUpperCase()) {
            marksAwarded = q.marks;
            totalScore += q.marks;
          } else {
            marksAwarded = 0;
          }
        } else {
          // Written question, needs manual review
          pendingManualReview = true;
          marksAwarded = null; 
        }
      } else {
        marksAwarded = 0; // Did not answer
      }

      // Check if answer already exists (from auto-save)
      const [existingAns] = await db.query(
        'SELECT id FROM student_answers WHERE student_id = ? AND exam_id = ? AND question_id = ?',
        [req.user.id, examId, q.id]
      );

      if (existingAns.length > 0) {
        // Update
        await db.query(
          'UPDATE student_answers SET student_answer = ?, marks_awarded = ? WHERE id = ?',
          [studentAnswer || '', marksAwarded, existingAns[0].id]
        );
      } else {
        // Insert
        await db.query(
          'INSERT INTO student_answers (student_id, exam_id, question_id, student_answer, marks_awarded) VALUES (?, ?, ?, ?, ?)',
          [req.user.id, examId, q.id, studentAnswer || '', marksAwarded]
        );
      }
    }

    // Update status to completed
    await db.query(
      "UPDATE student_exams SET score = ?, finished_at = NOW(), status = 'completed' WHERE student_id = ? AND exam_id = ?",
      [pendingManualReview ? null : totalScore, req.user.id, examId]
    );

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
