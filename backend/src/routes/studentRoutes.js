const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Protect all routes here with Student check
router.use(verifyToken, authorizeRoles('student'));



// Profile management
router.get('/profile', studentController.getProfile);
router.put('/profile', studentController.updateProfile);
router.put('/change-password', studentController.changePassword);

// Exams
router.get('/exams', studentController.getExams);
router.post('/exams/:examId/start', studentController.startExam);
router.get('/exams/:examId/questions', studentController.getExamQuestions);
router.get('/exams/:examId/answers', studentController.getSavedAnswers);
router.post('/exams/:examId/auto-save', studentController.autoSaveExam);
// AI Diagnostics & Subject Insights (Powered by Agent ELI)
router.get('/ai-insights', studentController.getAiInsights);
router.post('/ai-insights', studentController.getAiInsights);

module.exports = router;

