const db = require('../config/db');
const bcrypt = require('bcryptjs');

// --- PROFILE MANAGEMENT ---

exports.getProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, profile_image, joining_date, status FROM teachers WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Teacher not found' });
    const teacher = rows[0];
    return res.json(teacher);
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

    let query = 'UPDATE teachers SET name = ?';
    let params = [name];

    if (profile_image) {
      query += ', profile_image = ?';
      params.push(profile_image);
    }

    query += ' WHERE id = ?';
    params.push(req.user.id);

    await db.query(query, params);

    const [rows] = await db.query(
      'SELECT id, name, email, profile_image, joining_date, status FROM teachers WHERE id = ?',
      [req.user.id]
    );

    const teacher = rows[0];
    return res.json({ message: 'Profile updated successfully', user: teacher });
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
    const [rows] = await db.query('SELECT password FROM teachers WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const teacher = rows[0];
    const isMatch = await bcrypt.compare(oldPassword, teacher.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect old password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE teachers SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating password' });
  }
};

// --- EXAM MANAGEMENT ---

exports.getExams = async (req, res) => {
  try {
    const query = `
      SELECT e.*, 
             (SELECT COUNT(*) FROM exam_questions eq WHERE eq.exam_id = e.id) AS questions_count,
             (SELECT COUNT(*) FROM student_exams se WHERE se.exam_id = e.id) AS submissions_count
      FROM exams e
      WHERE e.teacher_id = ?
      ORDER BY e.exam_date DESC
    `;
    const [rows] = await db.query(query, [req.user.id]);
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching exams' });
  }
};

exports.createExam = async (req, res) => {
  const { title, duration_minutes, must_on_camera, must_on_microphone, exam_password, course_name, course_code, university_name, max_attempts } = req.body;
  if (!title || !duration_minutes) {
    return res.status(400).json({ message: 'Title and duration are required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO exams (title, exam_date, duration_minutes, teacher_id, must_on_camera, must_on_microphone, exam_password, course_name, course_code, university_name, max_attempts) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, duration_minutes, req.user.id, must_on_camera ?? true, must_on_microphone ?? true, exam_password || null, course_name || null, course_code || null, university_name || null, max_attempts || 1]
    );

    await db.query('INSERT INTO admin_notifications (message) VALUES (?)', [`Teacher ${req.user.name} created a new exam: ${title}`]);

    return res.status(201).json({ message: 'Exam created successfully', examId: result.insertId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error creating exam' });
  }
};

exports.updateExam = async (req, res) => {
  const { id } = req.params;
  const { title, duration_minutes, must_on_camera, must_on_microphone, exam_password, course_name, course_code, university_name, max_attempts } = req.body;
  
  if (!title || !duration_minutes) {
    return res.status(400).json({ message: 'Title and duration are required' });
  }
  
  try {
    const [result] = await db.query(
      `UPDATE exams SET title=?, duration_minutes=?, must_on_camera=?, must_on_microphone=?, exam_password=?, course_name=?, course_code=?, university_name=?, max_attempts=?
       WHERE id=? AND teacher_id=?`,
      [title, duration_minutes, must_on_camera ?? true, must_on_microphone ?? true, exam_password || null, course_name || null, course_code || null, university_name || null, max_attempts || 1, id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Exam not found or unauthorized' });

    await db.query('INSERT INTO admin_notifications (message) VALUES (?)', [`Teacher ${req.user.name} updated the exam: ${title}`]);

    return res.json({ message: 'Exam updated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating exam' });
  }
};

exports.deleteExam = async (req, res) => {
  const { id } = req.params;
  try {
    const [exam] = await db.query('SELECT title FROM exams WHERE id = ? AND teacher_id = ?', [id, req.user.id]);
    const examTitle = exam.length > 0 ? exam[0].title : `ID ${id}`;

    const [result] = await db.query('DELETE FROM exams WHERE id = ? AND teacher_id = ?', [id, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Exam not found or unauthorized' });

    await db.query('INSERT INTO admin_notifications (message) VALUES (?)', [`Teacher ${req.user.name} deleted the exam: ${examTitle}`]);

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
    const [exam] = await db.query('SELECT title FROM exams WHERE id = ? AND teacher_id = ?', [id, req.user.id]);
    const examTitle = exam.length > 0 ? exam[0].title : `ID ${id}`;

    if (is_live) {
      const [questions] = await db.query('SELECT COUNT(*) as count FROM exam_questions WHERE exam_id = ?', [id]);
      if (questions[0].count === 0) {
        return res.status(400).json({ message: 'Cannot make exam live. No questions have been added.', no_questions: true });
      }
    }

    const [result] = await db.query(
      'UPDATE exams SET is_live=?, exam_password=?, exam_date = IF(? = 1, NOW(), exam_date) WHERE id=? AND teacher_id=?',
      [is_live ? 1 : 0, is_live ? exam_password : null, is_live ? 1 : 0, id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Exam not found or unauthorized' });

    const statusStr = is_live ? 'LIVE' : 'OFFLINE';
    await db.query('INSERT INTO admin_notifications (message) VALUES (?)', [`Teacher ${req.user.name} changed exam status to ${statusStr}: ${examTitle}`]);

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
    // Verify exam ownership first
    const [exam] = await db.query('SELECT id FROM exams WHERE id = ? AND teacher_id = ?', [examId, req.user.id]);
    if (exam.length === 0) return res.status(403).json({ message: 'Unauthorized' });

    const [rows] = await db.query('SELECT * FROM exam_questions WHERE exam_id = ? ORDER BY sort_order ASC, id ASC', [examId]);
    return res.json(rows);
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
    const [exam] = await db.query('SELECT id FROM exams WHERE id = ? AND teacher_id = ?', [exam_id, req.user.id]);
    if (exam.length === 0) return res.status(403).json({ message: 'Unauthorized' });

    await db.query(
      `INSERT INTO exam_questions (exam_id, type, question_text, marks, option_a, option_b, option_c, option_d, correct_option)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [exam_id, type, question_text, marks, option_a||null, option_b||null, option_c||null, option_d||null, correct_option||null]
    );

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
    const [exam] = await db.query(`
      SELECT e.id FROM exams e 
      JOIN exam_questions eq ON e.id = eq.exam_id 
      WHERE eq.id = ? AND e.teacher_id = ?
    `, [id, req.user.id]);
    if (exam.length === 0) return res.status(403).json({ message: 'Unauthorized' });

    await db.query(
      `UPDATE exam_questions SET type=?, question_text=?, marks=?, option_a=?, option_b=?, option_c=?, option_d=?, correct_option=?
       WHERE id=?`,
      [type, question_text, marks, option_a||null, option_b||null, option_c||null, option_d||null, correct_option||null, id]
    );

    return res.json({ message: 'Question updated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating question' });
  }
};

exports.deleteQuestion = async (req, res) => {
  const { id } = req.params;
  try {
    // Verify exam ownership via question
    const [exam] = await db.query(`
      SELECT e.id FROM exams e 
      JOIN exam_questions eq ON e.id = eq.exam_id 
      WHERE eq.id = ? AND e.teacher_id = ?
    `, [id, req.user.id]);
    if (exam.length === 0) return res.status(403).json({ message: 'Unauthorized' });

    await db.query('DELETE FROM exam_questions WHERE id = ?', [id]);
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
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // First, verify teacher owns this exam
      const [examCheck] = await connection.query(
        'SELECT id FROM exams WHERE id = ? AND teacher_id = ?',
        [exam_id, req.user.id]
      );
      if (examCheck.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ message: 'Exam not found or unauthorized' });
      }

      // Perform updates
      for (let i = 0; i < ordered_ids.length; i++) {
        await connection.query(
          'UPDATE exam_questions SET sort_order = ? WHERE id = ? AND exam_id = ?',
          [i, ordered_ids[i], exam_id]
        );
      }

      await connection.commit();
      connection.release();
      return res.json({ message: 'Questions reordered successfully' });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
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
    const [exam] = await db.query('SELECT id FROM exams WHERE id = ? AND teacher_id = ?', [id, req.user.id]);
    if (exam.length === 0) return res.status(404).json({ message: 'Exam not found' });

    await db.query('UPDATE exams SET results_published = ? WHERE id = ?', [results_published ? 1 : 0, id]);
    return res.json({ message: 'Exam results publish status updated successfully' });
  } catch (error) {
    console.error('Error toggling publish status:', error);
    return res.status(500).json({ message: 'Server error updating publish status' });
  }
};

exports.getExamResults = async (req, res) => {
  const { id } = req.params;
  try {
    const [exam] = await db.query('SELECT id FROM exams WHERE id = ? AND teacher_id = ?', [id, req.user.id]);
    if (exam.length === 0) return res.status(403).json({ message: 'Unauthorized' });

    const query = `
      SELECT se.student_id, se.score, se.status, se.started_at, se.finished_at, se.demerit_points, se.id AS attempt_id,
             s.name, s.email
      FROM student_exams se
      JOIN students s ON se.student_id = s.id
      WHERE se.exam_id = ?
    `;
    const [rows] = await db.query(query, [id]);
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching exam results' });
  }
};

exports.downloadStudentLog = async (req, res) => {
  const { examId, studentId } = req.params;
  try {
    // Verify exam ownership
    const [exam] = await db.query('SELECT title FROM exams WHERE id = ? AND teacher_id = ?', [examId, req.user.id]);
    if (exam.length === 0) return res.status(403).json({ message: 'Unauthorized' });

    // Fetch logs
    const [logs] = await db.query(
      'SELECT activity_type, details, demerit_points, timestamp FROM proctoring_logs WHERE exam_id = ? AND student_id = ? ORDER BY timestamp ASC',
      [examId, studentId]
    );

    let logText = `AI Proctoring Log Feed\nExam: ${exam[0].title}\nStudent ID: ${studentId}\n-----------------------------------\n\n`;

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
    const [exam] = await db.query('SELECT id FROM exams WHERE id = ? AND teacher_id = ?', [examId, req.user.id]);
    if (exam.length === 0) return res.status(403).json({ message: 'Unauthorized' });

    // Get answers with questions
    const query = `
      SELECT sa.id as answer_id, sa.student_answer, sa.marks_awarded,
             eq.id as question_id, eq.type, eq.question_text, eq.marks as max_marks,
             eq.option_a, eq.option_b, eq.option_c, eq.option_d, eq.correct_option
      FROM exam_questions eq
      LEFT JOIN student_answers sa ON eq.id = sa.question_id AND sa.student_id = ?
      WHERE eq.exam_id = ?
    `;
    const [rows] = await db.query(query, [studentId, examId]);
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching answersheet' });
  }
};

exports.manualGradeAnswersheet = async (req, res) => {
  const { examId, studentId } = req.params;
  const { grades } = req.body; // Map: { answer_id: marks_awarded }

  try {
    const [exam] = await db.query('SELECT id FROM exams WHERE id = ? AND teacher_id = ?', [examId, req.user.id]);
    if (exam.length === 0) return res.status(403).json({ message: 'Unauthorized' });

    let totalMarks = 0;
    
    // Begin transaction? No need, just simple updates.
    for (const [answer_id, marks_awarded] of Object.entries(grades)) {
      await db.query(
        'UPDATE student_answers SET marks_awarded = ? WHERE id = ?',
        [marks_awarded, answer_id]
      );
    }
    
    // Recalculate total score
    const [scoreResult] = await db.query(
      'SELECT SUM(marks_awarded) as total FROM student_answers WHERE exam_id=? AND student_id=?',
      [examId, studentId]
    );
    
    const finalScore = scoreResult[0].total || 0;
    
    await db.query(
      'UPDATE student_exams SET score = ? WHERE exam_id=? AND student_id=?',
      [finalScore, examId, studentId]
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
    const query = `
      SELECT pl.*, 
             s.name AS student_name, s.email AS student_email,
             e.title AS exam_title
      FROM proctoring_logs pl
      JOIN students s ON pl.student_id = s.id
      JOIN exams e ON pl.exam_id = e.id
      WHERE e.teacher_id = ?
      ORDER BY pl.timestamp DESC
    `;
    const [rows] = await db.query(query, [req.user.id]);
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching proctoring logs' });
  }
};

// Get students for a specific exam
exports.getExamStudents = async (req, res) => {
  const { examId } = req.params;
  try {
    const [exam] = await db.query('SELECT id FROM exams WHERE id = ? AND teacher_id = ?', [examId, req.user.id]);
    if (exam.length === 0) return res.status(403).json({ message: 'Unauthorized' });

    const [rows] = await db.query(`
      SELECT s.id, s.name, se.status, se.demerit_points, se.score
      FROM student_exams se
      JOIN students s ON se.student_id = s.id
      WHERE se.exam_id = ?
    `, [examId]);
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error retrieving exam students' });
  }
};

// Download logs for a specific exam as CSV (Excel compatible)
exports.downloadExamLogs = async (req, res) => {
  const { examId } = req.params;
  try {
    const [exam] = await db.query('SELECT id FROM exams WHERE id = ? AND teacher_id = ?', [examId, req.user.id]);
    if (exam.length === 0) return res.status(403).json({ message: 'Unauthorized' });

    const [logs] = await db.query(`
      SELECT pl.student_id, s.name, pl.activity_type, pl.details, pl.timestamp
      FROM proctoring_logs pl
      JOIN students s ON pl.student_id = s.id
      WHERE pl.exam_id = ?
      ORDER BY pl.timestamp DESC
    `, [examId]);

    let csvContent = 'Student ID,Student Name,Activity Type,Details,Timestamp\n';
    logs.forEach(log => {
      const row = [
        `"${log.student_id}"`,
        `"${log.name}"`,
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
