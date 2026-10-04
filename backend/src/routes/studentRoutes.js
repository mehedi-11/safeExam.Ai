const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Protect all routes here with Student check
router.use(verifyToken, authorizeRoles('student'));

const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
    cb(null, 'student-profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 }, // 100 KB limit
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

// Profile management
router.get('/profile', studentController.getProfile);
router.put('/profile', upload.single('profile_image'), studentController.updateProfile);
router.put('/change-password', studentController.changePassword);

// Exams
router.get('/exams', studentController.getExams);
router.post('/exams/:examId/start', studentController.startExam);
router.get('/exams/:examId/questions', studentController.getExamQuestions);
router.get('/exams/:examId/answers', studentController.getSavedAnswers);
router.post('/exams/:examId/auto-save', studentController.autoSaveExam);
router.post('/exams/:examId/submit', studentController.submitExam);

module.exports = router;
