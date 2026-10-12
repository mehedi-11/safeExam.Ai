const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Registration routes
router.post('/send-registration-otp', authController.sendRegistrationOtp);
router.post('/register/teacher', authController.registerTeacher);
router.post('/register/student', authController.registerStudent);

// Login routes
router.post('/login/admin', authController.adminLogin);
router.post('/login/teacher', authController.teacherLogin);
router.post('/login/student', authController.studentLogin);

// Reset Password routes
router.post('/verify-identifier', authController.verifyIdentifier);
router.post('/verify-reset-otp', authController.verifyResetOtp);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
