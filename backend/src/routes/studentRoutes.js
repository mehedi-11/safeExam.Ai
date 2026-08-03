const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Protect all routes here with Student check
router.use(verifyToken, authorizeRoles('student'));

// Profile management
router.get('/profile', studentController.getProfile);
router.put('/change-password', studentController.changePassword);

// Exams
router.get('/exams', studentController.getExams);
router.post('/exams/:examId/start', studentController.startExam);
router.get('/exams/:examId/questions', studentController.getExamQuestions);
router.get('/exams/:examId/answers', studentController.getSavedAnswers);
router.post('/exams/:examId/auto-save', studentController.autoSaveExam);
router.post('/exams/:examId/submit', studentController.submitExam);

module.exports = router;
