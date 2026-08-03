const express = require('express');
const router = express.Router();
const proctorController = require('../controllers/proctorController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Log incident is called by student client page or camera script
router.post('/log-incident', verifyToken, proctorController.logIncident);

// View and Manage raw log file (Admin & Teacher only)
router.get('/raw-logs', verifyToken, authorizeRoles('admin', 'teacher'), proctorController.getRawLogs);
router.delete('/raw-logs', verifyToken, authorizeRoles('admin', 'teacher'), proctorController.clearRawLogs);

module.exports = router;
