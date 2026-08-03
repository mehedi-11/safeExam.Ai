const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// --- RATE LIMITING HELPERS ---
const checkRateLimit = async (identifier) => {
  const [rows] = await db.query('SELECT * FROM login_attempts WHERE identifier = ?', [identifier]);
  if (rows.length > 0) {
    const attempt = rows[0];
    if (attempt.blocked_until && new Date(attempt.blocked_until) > new Date()) {
      return { blocked: true, blocked_until: attempt.blocked_until };
    }
  }
  return { blocked: false };
};

const handleFailedLogin = async (identifier) => {
  const [rows] = await db.query('SELECT * FROM login_attempts WHERE identifier = ?', [identifier]);
  if (rows.length === 0) {
    await db.query('INSERT INTO login_attempts (identifier, failed_count) VALUES (?, 1)', [identifier]);
  } else {
    let count = rows[0].failed_count + 1;
    let blockUntil = null;
    if (count === 3) {
      blockUntil = new Date();
      blockUntil.setMinutes(blockUntil.getMinutes() + 5);
    } else if (count > 3) {
      blockUntil = new Date();
      blockUntil.setMinutes(blockUntil.getMinutes() + (5 * (count - 2)));
    }
    await db.query('UPDATE login_attempts SET failed_count = ?, blocked_until = ? WHERE identifier = ?', [count, blockUntil, identifier]);
    return blockUntil;
  }
  return null;
};

const handleSuccessfulLogin = async (identifier) => {
  await db.query('DELETE FROM login_attempts WHERE identifier = ?', [identifier]);
};

// Register Teacher
exports.registerTeacher = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if email already exists in teachers, students, or admins
    const [existingTeacher] = await db.query('SELECT id FROM teachers WHERE email = ?', [email]);
    if (existingTeacher.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO teachers (name, email, password, status) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, 'pending']
    );

    // Add notification for admin
    await db.query(
      'INSERT INTO admin_notifications (message) VALUES (?)', 
      [`New teacher registered: ${name} (${email})`]
    );

    return res.status(201).json({ message: 'Teacher registration request submitted. Awaiting Admin approval.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error during teacher registration' });
  }
};

// Register Student
exports.registerStudent = async (req, res) => {
  const { id, name, email, password } = req.body; // id is Student ID
  if (!id || !name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if student id or email already exists
    const [existingStudentId] = await db.query('SELECT id FROM students WHERE id = ?', [id]);
    if (existingStudentId.length > 0) {
      return res.status(400).json({ message: 'Student ID already exists' });
    }

    const [existingStudentEmail] = await db.query('SELECT id FROM students WHERE email = ?', [email]);
    if (existingStudentEmail.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO students (id, name, email, password, status) VALUES (?, ?, ?, ?, ?)',
      [id, name, email, hashedPassword, 'approved']
    );

    // Add notification for admin
    await db.query(
      'INSERT INTO admin_notifications (message) VALUES (?)', 
      [`New student registered: ${name} (${id})`]
    );

    return res.status(201).json({ message: 'Student registration successful. You can now login.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error during student registration' });
  }
};

// Admin Login (Email + Password)
exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const rateLimit = await checkRateLimit(email);
    if (rateLimit.blocked) {
      return res.status(403).json({ message: 'Account blocked due to too many failed attempts.', blocked_until: rateLimit.blocked_until });
    }

    const [rows] = await db.query('SELECT * FROM admins WHERE email = ?', [email]);
    if (rows.length === 0) {
      await handleFailedLogin(email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      const blockUntil = await handleFailedLogin(email);
      if (blockUntil) {
        return res.status(403).json({ message: 'Too many failed attempts. Account blocked.', blocked_until: blockUntil });
      }
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    await handleSuccessfulLogin(email);

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: { id: admin.id, email: admin.email, name: admin.name, role: 'admin' }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error during admin login' });
  }
};

// Teacher Login (Email + Password)
exports.teacherLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const rateLimit = await checkRateLimit(email);
    if (rateLimit.blocked) {
      return res.status(403).json({ message: 'Account blocked due to too many failed attempts.', blocked_until: rateLimit.blocked_until });
    }

    const [rows] = await db.query('SELECT * FROM teachers WHERE email = ?', [email]);
    if (rows.length === 0) {
      await handleFailedLogin(email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const teacher = rows[0];

    // Status checks
    if (teacher.status === 'pending') {
      return res.status(403).json({ message: 'Your account is pending admin approval' });
    }
    if (teacher.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended. Contact support.' });
    }

    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) {
      const blockUntil = await handleFailedLogin(email);
      if (blockUntil) {
        return res.status(403).json({ message: 'Too many failed attempts. Account blocked.', blocked_until: blockUntil });
      }
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    await handleSuccessfulLogin(email);

    const token = jwt.sign(
      { id: teacher.id, email: teacher.email, name: teacher.name, role: 'teacher' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: {
        id: teacher.id,
        email: teacher.email,
        name: teacher.name,
        role: 'teacher',
        profile_image: teacher.profile_image,
        joining_date: teacher.joining_date
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error during teacher login' });
  }
};

// Student Login (StudentID + Password)
exports.studentLogin = async (req, res) => {
  const { studentId, password } = req.body;
  if (!studentId || !password) {
    return res.status(400).json({ message: 'StudentID and password are required' });
  }

  try {
    const rateLimit = await checkRateLimit(studentId);
    if (rateLimit.blocked) {
      return res.status(403).json({ message: 'Account blocked due to too many failed attempts.', blocked_until: rateLimit.blocked_until });
    }

    const [rows] = await db.query('SELECT * FROM students WHERE id = ?', [studentId]);
    if (rows.length === 0) {
      await handleFailedLogin(studentId);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const student = rows[0];

    // Status checks
    if (student.status === 'pending') {
      return res.status(403).json({ message: 'Your account is pending admin approval' });
    }
    if (student.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended. Contact support.' });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      const blockUntil = await handleFailedLogin(studentId);
      if (blockUntil) {
        return res.status(403).json({ message: 'Too many failed attempts. Account blocked.', blocked_until: blockUntil });
      }
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    await handleSuccessfulLogin(studentId);

    const token = jwt.sign(
      { id: student.id, email: student.email, name: student.name, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: {
        id: student.id,
        email: student.email,
        name: student.name,
        role: 'student',
        profile_image: student.profile_image
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error during student login' });
  }
};

// --- RESET PASSWORD FLOW ---

exports.verifyIdentifier = async (req, res) => {
  const { role, identifier } = req.body;
  try {
    let tableName = '';
    let idColumn = '';
    
    if (role === 'student') {
      tableName = 'students';
      idColumn = 'id';
    } else if (role === 'teacher') {
      tableName = 'teachers';
      idColumn = 'email';
    } else if (role === 'admin') {
      tableName = 'admins';
      idColumn = 'email';
    } else {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const [rows] = await db.query(`SELECT email, name FROM ${tableName} WHERE ${idColumn} = ?`, [identifier]);
    if (rows.length === 0) return res.status(404).json({ message: 'Account not found' });
    
    const resetToken = crypto.randomInt(100000, 999999).toString();
    const tokenExpiry = new Date();
    tokenExpiry.setMinutes(tokenExpiry.getMinutes() + 15); // 15 mins expiry
    
    await db.query(`UPDATE ${tableName} SET reset_token = ?, reset_token_expiry = ? WHERE ${idColumn} = ?`, [resetToken, tokenExpiry, identifier]);
    
    // console.log(`[PASSWORD RESET] OTP for ${identifier} is ${resetToken}`);
    
    return res.json({ email: rows[0].email, name: rows[0].name, message: 'OTP sent successfully (Check server console for OTP)' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error verifying identifier' });
  }
};

exports.resetPassword = async (req, res) => {
  const { role, identifier, newPassword, resetToken } = req.body;
  if (!role || !identifier || !newPassword || !resetToken) {
    return res.status(400).json({ message: 'All fields including OTP are required' });
  }

  try {
    let tableName = '';
    let idColumn = '';
    
    if (role === 'student') {
      tableName = 'students';
      idColumn = 'id';
    } else if (role === 'teacher') {
      tableName = 'teachers';
      idColumn = 'email';
    } else if (role === 'admin') {
      tableName = 'admins';
      idColumn = 'email';
    } else {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const [rows] = await db.query(`SELECT reset_token, reset_token_expiry FROM ${tableName} WHERE ${idColumn} = ?`, [identifier]);
    if (rows.length === 0) return res.status(404).json({ message: 'Account not found' });
    
    const user = rows[0];
    if (user.reset_token !== resetToken || new Date() > new Date(user.reset_token_expiry)) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query(`UPDATE ${tableName} SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE ${idColumn} = ?`, [hashedPassword, identifier]);

    await handleSuccessfulLogin(identifier);

    return res.json({ message: 'Password reset successfully. You can now login.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error resetting password' });
  }
};
