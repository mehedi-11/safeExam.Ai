const db = require('../config/db');
const bcrypt = require('bcryptjs');



// Get Admin Profile
exports.getProfile = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, email, is_super_admin FROM admins WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    return res.json(rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching profile' });
  }
};

// Update Admin Profile
exports.updateProfile = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // Check if email already used by other admins
    const [emailCheck] = await db.query('SELECT id FROM admins WHERE email = ? AND id != ?', [email, req.user.id]);
    if (emailCheck.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE admins SET name = ?, email = ?, password = ? WHERE id = ?',
        [name, email, hashedPassword, req.user.id]
      );
    } else {
      await db.query(
        'UPDATE admins SET name = ?, email = ? WHERE id = ?',
        [name, email, req.user.id]
      );
    }

    return res.json({ message: 'Profile updated successfully', name, email });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating profile' });
  }
};

// --- ADMIN MANAGEMENT ---

exports.getAdmins = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, email FROM admins');
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching admins' });
  }
};

exports.addAdmin = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    // Check super admin status
    const [adminCheck] = await db.query('SELECT is_super_admin FROM admins WHERE id = ?', [req.user.id]);
    if (!adminCheck[0] || !adminCheck[0].is_super_admin) {
      return res.status(403).json({ message: 'Only Super Admins can add new admins' });
    }

    const [existing] = await db.query('SELECT id FROM admins WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO admins (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );
    return res.status(201).json({ message: 'Admin added successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error adding admin' });
  }
};

// --- TEACHER MANAGEMENT ---

// Get all teachers
exports.getTeachers = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, email, profile_image, joining_date, status FROM teachers');
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching teachers' });
  }
};

// Add Teacher (Approved directly)
exports.addTeacher = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    const [existing] = await db.query('SELECT id FROM teachers WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO teachers (name, email, password, status, joining_date) VALUES (?, ?, ?, ?, CURRENT_DATE)',
      [name, email, hashedPassword, 'approved']
    );

    return res.status(201).json({ message: 'Teacher added successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error adding teacher' });
  }
};

// Update Teacher Status (approve, suspend)
exports.updateTeacherStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'approved', 'suspended', 'pending'
  if (!['approved', 'suspended', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  try {
    await db.query('UPDATE teachers SET status = ? WHERE id = ?', [status, id]);
    return res.json({ message: `Teacher status updated to ${status}` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating teacher status' });
  }
};

// Delete Teacher
exports.deleteTeacher = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM teachers WHERE id = ?', [id]);
    return res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error deleting teacher' });
  }
};

// --- STUDENT MANAGEMENT ---

// Get all students
exports.getStudents = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, email, profile_image, status FROM students');
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching students' });
  }
};

// Add Student (Approved directly)
exports.addStudent = async (req, res) => {
  const { id, name, email, password } = req.body; // id is studentID
  if (!id || !name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    const [existingId] = await db.query('SELECT id FROM students WHERE id = ?', [id]);
    if (existingId.length > 0) {
      return res.status(400).json({ message: 'Student ID already exists' });
    }

    const [existingEmail] = await db.query('SELECT id FROM students WHERE email = ?', [email]);
    if (existingEmail.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO students (id, name, email, password, status) VALUES (?, ?, ?, ?, ?)',
      [id, name, email, hashedPassword, 'approved']
    );

    return res.status(201).json({ message: 'Student added successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error adding student' });
  }
};

// Update Student Status
exports.updateStudentStatus = async (req, res) => {
  const { id } = req.params; // studentID
  const { status } = req.body;
  if (!['approved', 'suspended', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  try {
    await db.query('UPDATE students SET status = ? WHERE id = ?', [status, id]);
    return res.json({ message: `Student status updated to ${status}` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating student status' });
  }
};

// Delete Student
exports.deleteStudent = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM students WHERE id = ?', [id]);
    return res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error deleting student' });
  }
};

// --- ADMIN EXAM MANAGEMENT ---
exports.getAllExams = async (req, res) => {
  try {
    const query = `
      SELECT e.id, e.title, e.exam_date, e.duration_minutes, e.end_time, e.type, e.is_live,
             t.name AS teacher_name, t.email AS teacher_email
      FROM exams e
      LEFT JOIN teachers t ON e.teacher_id = t.id
      ORDER BY e.exam_date DESC
    `;
    const [rows] = await db.query(query);
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching exams' });
  }
};

exports.deleteExam = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM exams WHERE id = ?', [id]);
    return res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error deleting exam' });
  }
};

// --- ADMIN NOTIFICATIONS ---
exports.getNotifications = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM admin_notifications ORDER BY created_at DESC');
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching notifications' });
  }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    await db.query('UPDATE admin_notifications SET is_read = TRUE WHERE is_read = FALSE');
    return res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating notifications' });
  }
};

// --- DASHBOARD STATS ---
exports.getDashboardStats = async (req, res) => {
  try {
    const [[{ totalTeachers }]] = await db.query("SELECT COUNT(*) AS totalTeachers FROM teachers");
    const [[{ totalStudents }]] = await db.query("SELECT COUNT(*) AS totalStudents FROM students");
    const [[{ totalExamsCreated }]] = await db.query("SELECT COUNT(*) AS totalExamsCreated FROM exams");
    const [[{ totalLiveExams }]] = await db.query("SELECT COUNT(*) AS totalLiveExams FROM exams WHERE is_live = 1");
    const [[{ totalExamsDone }]] = await db.query("SELECT COUNT(*) AS totalExamsDone FROM student_exams WHERE status = 'completed'");
    
    // Get top 5 teachers by number of exams created
    const [topTeachers] = await db.query(`
      SELECT t.id, t.name, t.email, COUNT(e.id) AS exam_count
      FROM teachers t
      LEFT JOIN exams e ON t.id = e.teacher_id
      GROUP BY t.id
      ORDER BY exam_count DESC
      LIMIT 5
    `);

    // Get top 10 students by average score
    const [topStudents] = await db.query(`
      SELECT s.id, s.name, s.email, AVG(se.score) AS average_score, COUNT(se.id) AS total_exams
      FROM students s
      JOIN student_exams se ON s.id = se.student_id
      WHERE se.status = 'completed'
      GROUP BY s.id
      ORDER BY average_score DESC
      LIMIT 10
    `);

    return res.json({
      totalTeachers,
      totalStudents,
      totalExamsCreated,
      totalLiveExams,
      totalExamsDone,
      topTeachers,
      topStudents
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching dashboard stats' });
  }
};

// --- BULK IMPORT ---
exports.addBulkStudents = async (req, res) => {
  const { students } = req.body; // Array of {id, name, email, password}
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ message: 'No valid data provided' });
  }
  try {
    let count = 0;
    for (const student of students) {
      if (student.id && student.name && student.email && student.password) {
        const [existing] = await db.query('SELECT id FROM students WHERE id = ? OR email = ?', [student.id, student.email]);
        if (existing.length === 0) {
          const hashedPassword = await bcrypt.hash(student.password, 10);
          await db.query(
            'INSERT INTO students (id, name, email, password, status) VALUES (?, ?, ?, ?, ?)',
            [student.id, student.name, student.email, hashedPassword, 'approved']
          );
          count++;
        }
      }
    }

    return res.status(201).json({ message: `${count} students added successfully` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error bulk adding students' });
  }
};

exports.addBulkTeachers = async (req, res) => {
  const { teachers } = req.body; // Array of {name, email, password}
  if (!Array.isArray(teachers) || teachers.length === 0) {
    return res.status(400).json({ message: 'No valid data provided' });
  }
  try {
    let count = 0;
    for (const teacher of teachers) {
      if (teacher.name && teacher.email && teacher.password) {
        const [existing] = await db.query('SELECT id FROM teachers WHERE email = ?', [teacher.email]);
        if (existing.length === 0) {
          const hashedPassword = await bcrypt.hash(teacher.password, 10);
          await db.query(
            'INSERT INTO teachers (name, email, password, status, joining_date) VALUES (?, ?, ?, ?, CURRENT_DATE)',
            [teacher.name, teacher.email, hashedPassword, 'approved']
          );
          count++;
        }
      }
    }

    return res.status(201).json({ message: `${count} teachers added successfully` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error bulk adding teachers' });
  }
};



// --- SETTINGS ---
exports.getSettings = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM system_settings');
    const settings = {};
    rows.forEach(r => settings[r.setting_key] = r.setting_value);
    return res.json(settings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching settings' });
  }
};

exports.updateSettings = async (req, res) => {
  const settings = req.body; // Object of key-value pairs
  try {
    // Check super admin status
    const [adminCheck] = await db.query('SELECT is_super_admin FROM admins WHERE id = ?', [req.user.id]);
    if (!adminCheck[0] || !adminCheck[0].is_super_admin) {
      return res.status(403).json({ message: 'Only Super Admins can update settings' });
    }

    for (const [key, value] of Object.entries(settings)) {
      await db.query(
        'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, value, value]
      );
    }

    return res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating settings' });
  }
};

// --- ANALYTICS ---
exports.getAnalytics = async (req, res) => {
  try {
    // Get exams per month for the current year
    const currentYear = new Date().getFullYear();
    const [monthlyExams] = await db.query(`
      SELECT MONTH(exam_date) as month, COUNT(*) as count 
      FROM exams 
      WHERE YEAR(exam_date) = ? 
      GROUP BY MONTH(exam_date)
    `, [currentYear]);

    // Get cheating logs summary
    const [cheatingStats] = await db.query(`
      SELECT activity_type, COUNT(*) as count 
      FROM proctoring_logs 
      GROUP BY activity_type
    `);

    // Get active vs suspended students
    const [studentStatusStats] = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM students 
      GROUP BY status
    `);

    return res.json({
      monthlyExams,
      cheatingStats,
      studentStatusStats
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching analytics' });
  }
};

// --- STUDENT EXAMS DETAILS ---
exports.getStudentExamsDetails = async (req, res) => {
  const { studentId } = req.params;
  try {
    const query = `
      SELECT e.title, se.score, se.finished_at 
      FROM student_exams se 
      JOIN exams e ON se.exam_id = e.id 
      WHERE se.student_id = ? AND se.status = 'completed'
      ORDER BY se.finished_at DESC
    `;
    const [rows] = await db.query(query, [studentId]);
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching student exams details' });
  }
};
