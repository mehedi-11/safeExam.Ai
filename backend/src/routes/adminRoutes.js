const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Protect all routes here with Admin check
router.use(verifyToken, authorizeRoles('admin'));

// Profile
router.get('/profile', adminController.getProfile);
router.put('/profile', adminController.updateProfile);

// Dashboard Stats
router.get('/dashboard-stats', adminController.getDashboardStats);

// Admin management
router.get('/admins', adminController.getAdmins);
router.post('/admins', adminController.addAdmin);

// Exam Management
router.get('/all-exams', adminController.getAllExams);
router.delete('/exams/:id', adminController.deleteExam);

// Notifications
router.get('/notifications', adminController.getNotifications);
router.put('/notifications/mark-read', adminController.markNotificationsRead);

// Teacher management
router.get('/teachers', adminController.getTeachers);
router.post('/teachers', adminController.addTeacher);
router.post('/teachers/bulk', adminController.addBulkTeachers);
router.put('/teachers/:id/status', adminController.updateTeacherStatus);
router.delete('/teachers/:id', adminController.deleteTeacher);

// Student management
router.get('/students', adminController.getStudents);
router.post('/students', adminController.addStudent);
router.post('/students/bulk', adminController.addBulkStudents);
router.put('/students/:id/status', adminController.updateStudentStatus);
router.delete('/students/:id', adminController.deleteStudent);
router.get('/student-exams/:studentId', adminController.getStudentExamsDetails);


router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);
router.get('/analytics', adminController.getAnalytics);

module.exports = router;
