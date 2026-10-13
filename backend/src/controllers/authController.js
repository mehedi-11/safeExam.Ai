const Admin = require('../models/Admin');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const LoginAttempt = require('../models/LoginAttempt');
const AdminNotification = require('../models/AdminNotification');
const Otp = require('../models/Otp');
const { sendOtpEmail } = require('../utils/sendEmail');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// --- RATE LIMITING HELPERS ---
const checkRateLimit = async (identifier, role = 'admin') => {
  const attempt = await LoginAttempt.findOne({ identifier });
  if (attempt) {
    if (role === 'admin' && attempt.lock_until && new Date(attempt.lock_until) > new Date()) {
      return { blocked: true, blocked_until: attempt.lock_until };
    }
  }
  return { blocked: false };
};

const handleFailedLogin = async (identifier, role = 'admin') => {
  let attempt = await LoginAttempt.findOne({ identifier });
  if (!attempt) {
    attempt = new LoginAttempt({ identifier, attempts: 1 });
    await attempt.save();
    return null;
  } else {
    attempt.attempts += 1;
    
    if (role === 'admin') {
      let blockUntil = null;
      if (attempt.attempts === 3) {
        blockUntil = new Date();
        blockUntil.setMinutes(blockUntil.getMinutes() + 5);
      } else if (attempt.attempts > 3) {
        blockUntil = new Date();
        blockUntil.setMinutes(blockUntil.getMinutes() + (5 * (attempt.attempts - 2)));
      }
      attempt.lock_until = blockUntil;
      attempt.last_attempt = new Date();
      await attempt.save();
      return blockUntil;
    } else {
      // For Teacher and Student
      attempt.last_attempt = new Date();
      await attempt.save();

      if (attempt.attempts >= 3) {
        // Suspend the account
        let user;
        if (role === 'teacher') {
          user = await Teacher.findOneAndUpdate({ email: identifier }, { status: 'suspended' }, { new: true });
        } else if (role === 'student') {
          user = await Student.findOneAndUpdate({ id: identifier }, { status: 'suspended' }, { new: true });
        }

        if (user) {
          const notif = new AdminNotification({
            title: 'Account Suspended',
            message: `${role === 'teacher' ? 'Teacher' : 'Student'} ${user.name} (${identifier}) is blocked due to this reason: Exceeded maximum login attempts with wrong password.`
          });
          await notif.save();
        }
        return 'suspended';
      }
      return null;
    }
  }
};

const handleSuccessfulLogin = async (identifier) => {
  await LoginAttempt.deleteOne({ identifier });
};

// Send Registration OTP
exports.sendRegistrationOtp = async (req, res) => {
  const { role, email, name, id } = req.body;
  if (!email || !name) {
    return res.status(400).json({ message: 'Name and email are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    if (role === 'teacher') {
      const existingTeacher = await Teacher.findOne({ email: normalizedEmail });
      if (existingTeacher) {
        return res.status(400).json({ message: 'Email already registered' });
      }
    } else if (role === 'student') {
      if (id) {
        const existingStudentId = await Student.findOne({ id: String(id).trim() });
        if (existingStudentId) {
          return res.status(400).json({ message: 'Student ID already exists' });
        }
      }
      const existingStudentEmail = await Student.findOne({ email: normalizedEmail });
      if (existingStudentEmail) {
        return res.status(400).json({ message: 'Email already registered' });
      }
    }

    const otp = crypto.randomInt(100000, 999999).toString();

    await Otp.findOneAndUpdate(
      { email: normalizedEmail, purpose: 'registration' },
      { otp, createdAt: new Date() },
      { upsert: true, new: true }
    );

    await sendOtpEmail(normalizedEmail, name, otp, 'Account Registration');

    return res.json({
      email: normalizedEmail,
      name,
      otp,
      message: 'OTP has been sent to your email.'
    });
  } catch (error) {
    console.error('Error sending registration OTP:', error);
    return res.status(500).json({ message: 'Server error sending OTP' });
  }
};

// Register Teacher
exports.registerTeacher = async (req, res) => {
  const { name, email, password, otp } = req.body;
  if (!name || !email || !password || !otp) {
    return res.status(400).json({ message: 'All fields including OTP are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Verify OTP
    const storedOtp = await Otp.findOne({ email: normalizedEmail, purpose: 'registration' });
    if (!storedOtp || storedOtp.otp !== String(otp).trim()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const existingTeacher = await Teacher.findOne({ email: normalizedEmail });
    if (existingTeacher) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newTeacher = new Teacher({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      status: 'pending',
      joining_date: new Date()
    });
    await newTeacher.save();

    // Invalidate consumed OTP
    await Otp.deleteMany({ email: normalizedEmail, purpose: 'registration' });

    const notif = new AdminNotification({
      title: 'New Teacher Registration',
      message: `New teacher registered: ${name} (${normalizedEmail})`
    });
    await notif.save();

    return res.status(201).json({ message: 'Teacher registration request submitted. Awaiting Admin approval.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error during teacher registration' });
  }
};

// Register Student
exports.registerStudent = async (req, res) => {
  const { id, name, email, password, otp } = req.body; // id is Student ID
  if (!id || !name || !email || !password || !otp) {
    return res.status(400).json({ message: 'All fields including OTP are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedId = String(id).trim();

  try {
    // Verify OTP
    const storedOtp = await Otp.findOne({ email: normalizedEmail, purpose: 'registration' });
    if (!storedOtp || storedOtp.otp !== String(otp).trim()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const existingStudentId = await Student.findOne({ id: normalizedId });
    if (existingStudentId) {
      return res.status(400).json({ message: 'Student ID already exists' });
    }

    const existingStudentEmail = await Student.findOne({ email: normalizedEmail });
    if (existingStudentEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newStudent = new Student({
      id: normalizedId,
      name,
      email: normalizedEmail,
      password: hashedPassword,
      status: 'active'
    });
    await newStudent.save();

    // Invalidate consumed OTP
    await Otp.deleteMany({ email: normalizedEmail, purpose: 'registration' });

    const notif = new AdminNotification({
      title: 'New Student Registration',
      message: `New student registered: ${name} (${normalizedId})`
    });
    await notif.save();

    return res.status(201).json({ message: 'Student registration successful. You can now login.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error during student registration' });
  }
};

// Admin Login
exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.json({ success: false, message: 'Email and password are required' });
  }

  try {
    const rateLimit = await checkRateLimit(email, 'admin');
    if (rateLimit.blocked) {
      return res.json({ success: false, message: 'Account blocked due to too many failed attempts.', blocked_until: rateLimit.blocked_until });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      await handleFailedLogin(email, 'admin');
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      const blockUntil = await handleFailedLogin(email, 'admin');
      if (blockUntil) {
        return res.json({ success: false, message: 'Too many failed attempts. Account blocked.', blocked_until: blockUntil });
      }
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    await handleSuccessfulLogin(email);

    const token = jwt.sign(
      { id: admin._id, email: admin.email, name: admin.name, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      token,
      user: { id: admin._id, email: admin.email, name: admin.name, role: 'admin' }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error during admin login' });
  }
};

// Teacher Login
exports.teacherLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.json({ success: false, message: 'Email and password are required' });
  }

  try {
    const rateLimit = await checkRateLimit(email, 'teacher');
    if (rateLimit.blocked) {
      return res.json({ success: false, message: 'Account blocked due to too many failed attempts.', blocked_until: rateLimit.blocked_until });
    }

    const teacher = await Teacher.findOne({ email });
    if (!teacher) {
      await handleFailedLogin(email, 'teacher');
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    if (teacher.status === 'pending') {
      return res.json({ success: false, message: 'Your account is pending admin approval' });
    }
    if (teacher.status === 'blocked' || teacher.status === 'suspended') {
      return res.json({ success: false, message: 'Your account has been suspended. Contact support.' });
    }

    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) {
      const suspendStatus = await handleFailedLogin(email, 'teacher');
      if (suspendStatus === 'suspended') {
        return res.json({ success: false, message: 'Your account has been suspended due to multiple failed login attempts. Contact support.' });
      }
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    await handleSuccessfulLogin(email);

    const token = jwt.sign(
      { id: teacher._id, email: teacher.email, name: teacher.name, role: 'teacher' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: teacher._id,
        email: teacher.email,
        name: teacher.name,
        role: 'teacher',
        profile_image: teacher.profile_image,
        joining_date: teacher.joining_date
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error during teacher login' });
  }
};

// Student Login
exports.studentLogin = async (req, res) => {
  const { studentId, password } = req.body;
  if (!studentId || !password) {
    return res.json({ success: false, message: 'StudentID and password are required' });
  }
  const passwordStr = String(password);

  try {
    const rateLimit = await checkRateLimit(studentId, 'student');
    if (rateLimit.blocked) {
      return res.json({ success: false, message: 'Account blocked due to too many failed attempts.', blocked_until: rateLimit.blocked_until });
    }

    const student = await Student.findOne({ id: studentId });
    if (!student) {
      await handleFailedLogin(studentId, 'student');
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    if (student.status === 'pending') {
      return res.json({ success: false, message: 'Your account is pending admin approval' });
    }
    if (student.status === 'blocked' || student.status === 'suspended') {
      return res.json({ success: false, message: 'Your account has been suspended. Contact support.' });
    }

    const isMatch = await bcrypt.compare(passwordStr, student.password || '');
    if (!isMatch) {
      const suspendStatus = await handleFailedLogin(studentId, 'student');
      if (suspendStatus === 'suspended') {
        return res.json({ success: false, message: 'Your account has been suspended due to multiple failed login attempts. Contact support.' });
      }
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    await handleSuccessfulLogin(studentId);

    const token = jwt.sign(
      { id: student.id, email: student.email, name: student.name, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
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
    return res.status(500).json({ success: false, message: 'Server error during student login' });
  }
};

// --- RESET PASSWORD FLOW ---
exports.verifyIdentifier = async (req, res) => {
  const { role, identifier } = req.body;
  try {
    let user = null;
    
    if (role === 'student') {
      user = await Student.findOne({ id: identifier });
    } else if (role === 'teacher') {
      user = await Teacher.findOne({ email: identifier });
    } else if (role === 'admin') {
      user = await Admin.findOne({ email: identifier });
    } else {
      return res.json({ success: false, message: 'Invalid role' });
    }

    if (!user) return res.json({ success: false, message: 'Account not found' });
    
    const resetToken = crypto.randomInt(100000, 999999).toString();
    const tokenExpiry = new Date();
    tokenExpiry.setMinutes(tokenExpiry.getMinutes() + 15);
    
    const Model = role === 'student' ? Student : role === 'teacher' ? Teacher : Admin;
    await Model.updateOne({ _id: user._id }, { $set: { reset_token: resetToken, reset_token_expiry: tokenExpiry } }, { strict: false });
    
    // Send email securely from backend (Single email sent via EmailJS REST API)
    await sendOtpEmail(user.email, user.name, resetToken, 'Password Reset');

    return res.json({
      success: true,
      email: user.email,
      name: user.name,
      message: 'OTP has been sent to your registered email address.'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error verifying identifier' });
  }
};

exports.verifyResetOtp = async (req, res) => {
  const { role, identifier, otp } = req.body;
  if (!role || !identifier || !otp) {
    return res.json({ success: false, message: 'All fields including OTP are required' });
  }

  try {
    let user = null;
    let Model = null;
    
    if (role === 'student') {
      Model = Student;
      user = await Model.findOne({ id: identifier });
    } else if (role === 'teacher') {
      Model = Teacher;
      user = await Model.findOne({ email: identifier });
    } else if (role === 'admin') {
      Model = Admin;
      user = await Model.findOne({ email: identifier });
    } else {
      return res.json({ success: false, message: 'Invalid role' });
    }

    if (!user) return res.json({ success: false, message: 'Account not found' });

    const rawUser = await Model.findById(user._id).lean();
    if (!rawUser || !rawUser.reset_token || rawUser.reset_token !== String(otp).trim() || new Date() > new Date(rawUser.reset_token_expiry)) {
      return res.json({ success: false, message: 'Invalid or expired OTP' });
    }

    return res.json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error verifying OTP' });
  }
};

exports.resetPassword = async (req, res) => {
  const { role, identifier, newPassword, resetToken, otp } = req.body;
  const tokenToVerify = resetToken || otp;

  if (!role || !identifier || !newPassword || !tokenToVerify) {
    return res.json({ success: false, message: 'All fields including OTP are required' });
  }

  try {
    let user = null;
    let Model = null;
    
    if (role === 'student') {
      Model = Student;
      user = await Model.findOne({ id: identifier });
    } else if (role === 'teacher') {
      Model = Teacher;
      user = await Model.findOne({ email: identifier });
    } else if (role === 'admin') {
      Model = Admin;
      user = await Model.findOne({ email: identifier });
    } else {
      return res.json({ success: false, message: 'Invalid role' });
    }

    if (!user) return res.json({ success: false, message: 'Account not found' });
    
    // Check reset token via lean document
    const rawUser = await Model.findById(user._id).lean();
    
    if (!rawUser || !rawUser.reset_token || rawUser.reset_token !== String(tokenToVerify).trim() || new Date() > new Date(rawUser.reset_token_expiry)) {
      return res.json({ success: false, message: 'Invalid or expired OTP' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Model.findByIdAndUpdate(
      user._id,
      { $set: { password: hashedPassword }, $unset: { reset_token: "", reset_token_expiry: "" } }
    );

    await handleSuccessfulLogin(identifier);

    return res.json({ success: true, message: 'Password reset successfully. You can now login.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error resetting password' });
  }
};
