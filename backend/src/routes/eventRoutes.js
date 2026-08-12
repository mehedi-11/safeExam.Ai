const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { verifyToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

router.post('/', eventController.createEvent);
router.get('/', eventController.getEvents);
router.get('/:id', eventController.getEventDetails);
router.put('/:id/live', eventController.makeEventLive);
router.post('/:id/register', eventController.registerForEvent);
router.get('/:id/registrations', eventController.getEventRegistrations);

module.exports = router;
