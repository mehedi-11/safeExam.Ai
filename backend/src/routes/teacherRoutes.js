const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer storage for profile pictures
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'teacher-profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (jpeg, jpg, png, webp) are allowed!'));
    }
  }
});

// Protect all routes here with Teacher check
router.use(verifyToken, authorizeRoles('teacher'));

// Profile management
router.get('/profile', teacherController.getProfile);
router.put('/profile', upload.single('profile_image'), teacherController.updateProfile);
router.put('/change-password', teacherController.changePassword);

// Exams
router.get('/exams', teacherController.getExams);
router.post('/exams', teacherController.createExam);
router.put('/exams/:id', teacherController.updateExam);
router.delete('/exams/:id', teacherController.deleteExam);
router.post('/exams/:id/live', teacherController.toggleExamLive);

// Exam Results & Grading
router.get('/exams/:id/results', teacherController.getExamResults);
router.get('/exams/:examId/students/:studentId/answers', teacherController.getStudentAnswersheet);
router.post('/exams/:examId/students/:studentId/grade/manual', teacherController.manualGradeAnswersheet);

// Exam Questions
router.get('/exams/:examId/questions', teacherController.getQuestions);
router.post('/questions', teacherController.createQuestion);
router.put('/questions/:id', teacherController.updateQuestion);
router.delete('/questions/:id', teacherController.deleteQuestion);

// Exam Students & Logs
router.get('/exams/:examId/students', teacherController.getExamStudents);
router.get('/exams/:examId/logs/download', teacherController.downloadExamLogs);

// Proctoring
router.get('/proctoring-logs', teacherController.getProctoringLogs);

module.exports = router;
