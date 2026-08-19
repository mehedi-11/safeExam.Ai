const Admin = require('../models/Admin');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Exam = require('../models/Exam');
const AdminNotification = require('../models/AdminNotification');
const SystemSetting = require('../models/SystemSetting');
const Event = require('../models/Event');
const StudentExam = require('../models/StudentExam');
const ProctoringLog = require('../models/ProctoringLog');
const bcrypt = require('bcryptjs');

// Get Admin Profile
exports.getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select('_id name email is_super_admin');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    // Rename _id to id for frontend compatibility
    const response = admin.toObject();
    response.id = response._id;
    return res.json(response);
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
    const emailCheck = await Admin.findOne({ email, _id: { $ne: req.user.id } });
    if (emailCheck) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const updateData = { name, email };

    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await Admin.findByIdAndUpdate(req.user.id, updateData);

    return res.json({ message: 'Profile updated successfully', name, email });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating profile' });
  }
};

// --- ADMIN MANAGEMENT ---

exports.getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select('_id name email');
    const response = admins.map(a => { const obj = a.toObject(); obj.id = obj._id; return obj; });
    return res.json(response);
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
    const reqAdmin = await Admin.findById(req.user.id);
    if (!reqAdmin || !reqAdmin.is_super_admin) {
      return res.status(403).json({ message: 'Only Super Admins can add new admins' });
    }

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ name, email, password: hashedPassword });
    await newAdmin.save();
    return res.status(201).json({ message: 'Admin added successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error adding admin' });
  }
};

// --- TEACHER MANAGEMENT ---

exports.getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find().select('_id name email profile_image joining_date status');
    const response = teachers.map(a => { const obj = a.toObject(); obj.id = obj._id; return obj; });
    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching teachers' });
  }
};

exports.addTeacher = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    const existing = await Teacher.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newTeacher = new Teacher({ name, email, password: hashedPassword, status: 'active', joining_date: new Date() });
    await Teacher.collection.insertOne({ name, email, password: hashedPassword, status: 'approved', joining_date: new Date() }); // Using insertOne to bypass schema strictness for status='approved' since schema might be active/blocked

    return res.status(201).json({ message: 'Teacher added successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error adding teacher' });
  }
};

exports.updateTeacherStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'approved', 'suspended', 'pending'
  if (!['approved', 'suspended', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  try {
    await Teacher.collection.updateOne({ _id: new (require('mongoose').Types.ObjectId)(id) }, { $set: { status } });
    return res.json({ message: `Teacher status updated to ${status}` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating teacher status' });
  }
};

exports.deleteTeacher = async (req, res) => {
  const { id } = req.params;
  try {
    await Teacher.findByIdAndDelete(id);
    return res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error deleting teacher' });
  }
};

// --- STUDENT MANAGEMENT ---

exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find().select('id name email profile_image status joining_date');
    const stats = await StudentExam.aggregate([
      { $group: { _id: "$student_id", totalExams: { $sum: 1 }, avgScore: { $avg: "$total_score" } } }
    ]);
    const statsMap = {};
    stats.forEach(s => { statsMap[s._id] = s; });

    const response = students.map(st => {
      const obj = st.toObject();
      const s = statsMap[obj.id] || { totalExams: 0, avgScore: 0 };
      obj.totalExams = s.totalExams;
      obj.avgScore = s.avgScore ? Math.round(s.avgScore) : 0;
      return obj;
    });

    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching students' });
  }
};

exports.addStudent = async (req, res) => {
  const { id, name, email, password } = req.body; // id is studentID
  if (!id || !name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    const existingId = await Student.findOne({ id });
    if (existingId) {
      return res.status(400).json({ message: 'Student ID already exists' });
    }

    const existingEmail = await Student.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await Student.collection.insertOne({ id, name, email, password: hashedPassword, status: 'approved' });

    return res.status(201).json({ message: 'Student added successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error adding student' });
  }
};

exports.updateStudentStatus = async (req, res) => {
  const { id } = req.params; // studentID
  const { status } = req.body;
  if (!['approved', 'suspended', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  try {
    await Student.collection.updateOne({ id }, { $set: { status } });
    return res.json({ message: `Student status updated to ${status}` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating student status' });
  }
};

exports.deleteStudent = async (req, res) => {
  const { id } = req.params; // student ID
  try {
    await Student.deleteOne({ id });
    return res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error deleting student' });
  }
};

// --- ADMIN EXAM MANAGEMENT ---
exports.getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find().populate('teacher_id', 'name email').sort({ exam_date: -1 });
    const response = exams.map(e => {
      const obj = e.toObject();
      obj.id = obj._id;
      if (obj.teacher_id) {
        obj.teacher_name = obj.teacher_id.name;
        obj.teacher_email = obj.teacher_id.email;
      }
      return obj;
    });
    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching exams' });
  }
};

exports.deleteExam = async (req, res) => {
  const { id } = req.params;
  try {
    await Exam.findByIdAndDelete(id);
    return res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error deleting exam' });
  }
};

// --- ADMIN NOTIFICATIONS ---
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await AdminNotification.find().sort({ created_at: -1 });
    const response = notifications.map(a => { const obj = a.toObject(); obj.id = obj._id; return obj; });
    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching notifications' });
  }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    await AdminNotification.updateMany({ is_read: false }, { $set: { is_read: true } });
    return res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error updating notifications' });
  }
};

// --- DASHBOARD STATS ---
exports.getDashboardStats = async (req, res) => {
  try {
    const totalTeachers = await Teacher.countDocuments();
    const totalStudents = await Student.countDocuments();
    const totalExamsCreated = await Exam.countDocuments();
    const totalLiveExams = await Exam.countDocuments({ is_live: true });
    const totalExamsDone = await StudentExam.countDocuments({ status: 'completed' });
    
    // Get top 5 teachers by number of exams created
    const topTeachersAgg = await Exam.aggregate([
      { $group: { _id: "$teacher_id", exam_count: { $sum: 1 } } },
      { $sort: { exam_count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'teachers', localField: '_id', foreignField: '_id', as: 'teacher' } },
      { $unwind: "$teacher" },
      { $project: { id: "$teacher._id", name: "$teacher.name", email: "$teacher.email", exam_count: 1, _id: 0 } }
    ]);

    // Get top 10 students by average score
    const topStudentsAgg = await StudentExam.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: "$student_id", average_score: { $avg: "$total_score" }, total_exams: { $sum: 1 } } },
      { $sort: { average_score: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'students', localField: '_id', foreignField: 'id', as: 'student' } },
      { $unwind: "$student" },
      { $project: { id: "$student.id", name: "$student.name", email: "$student.email", average_score: 1, total_exams: 1, _id: 0 } }
    ]);

    return res.json({
      totalTeachers,
      totalStudents,
      totalExamsCreated,
      totalLiveExams,
      totalExamsDone,
      topTeachers: topTeachersAgg,
      topStudents: topStudentsAgg
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching dashboard stats' });
  }
};

// --- BULK IMPORT ---
exports.addBulkStudents = async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ message: 'No valid data provided' });
  }
  try {
    let count = 0;
    for (const student of students) {
      if (student.id && student.name && student.email && student.password) {
        const existing = await Student.findOne({ $or: [{ id: student.id }, { email: student.email }] });
        if (!existing) {
          const hashedPassword = await bcrypt.hash(student.password, 10);
          await Student.collection.insertOne({
            id: student.id,
            name: student.name,
            email: student.email,
            password: hashedPassword,
            status: 'approved'
          });
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
  const { teachers } = req.body;
  if (!Array.isArray(teachers) || teachers.length === 0) {
    return res.status(400).json({ message: 'No valid data provided' });
  }
  try {
    let count = 0;
    for (const teacher of teachers) {
      if (teacher.name && teacher.email && teacher.password) {
        const existing = await Teacher.findOne({ email: teacher.email });
        if (!existing) {
          const hashedPassword = await bcrypt.hash(teacher.password, 10);
          await Teacher.collection.insertOne({
            name: teacher.name,
            email: teacher.email,
            password: hashedPassword,
            status: 'approved',
            joining_date: new Date()
          });
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
    const rows = await SystemSetting.find();
    const settings = {};
    rows.forEach(r => settings[r.setting_key] = r.setting_value);
    return res.json(settings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching settings' });
  }
};

exports.updateSettings = async (req, res) => {
  const settings = req.body;
  try {
    const reqAdmin = await Admin.findById(req.user.id);
    if (!reqAdmin || !reqAdmin.is_super_admin) {
      return res.status(403).json({ message: 'Only Super Admins can update settings' });
    }

    for (const [key, value] of Object.entries(settings)) {
      await SystemSetting.findOneAndUpdate(
        { setting_key: key },
        { setting_value: value },
        { upsert: true }
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
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear + 1, 0, 1);
    
    const monthlyExamsAgg = await Exam.aggregate([
      { $match: { exam_date: { $gte: startOfYear, $lt: endOfYear } } },
      { $group: { _id: { $month: "$exam_date" }, count: { $sum: 1 } } },
      { $project: { month: "$_id", count: 1, _id: 0 } }
    ]);

    const cheatingStatsAgg = await ProctoringLog.aggregate([
      { $group: { _id: "$activity_type", count: { $sum: 1 } } },
      { $project: { activity_type: "$_id", count: 1, _id: 0 } }
    ]);

    const studentStatusStatsAgg = await Student.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { status: "$_id", count: 1, _id: 0 } }
    ]);

    return res.json({
      monthlyExams: monthlyExamsAgg,
      cheatingStats: cheatingStatsAgg,
      studentStatusStats: studentStatusStatsAgg
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
    const studentExams = await StudentExam.find({ student_id: studentId, status: 'completed' })
      .populate('exam_id', 'title')
      .sort({ completed_at: -1 });
      
    const response = studentExams.map(se => ({
      title: se.exam_id ? se.exam_id.title : 'Unknown Exam',
      score: se.total_score,
      finished_at: se.completed_at
    }));
    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching student exams details' });
  }
};
