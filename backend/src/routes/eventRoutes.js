const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { verifyToken, optionalAuth } = require('../middleware/authMiddleware');

// Public / Optional Auth Routes
router.get('/:id', optionalAuth, eventController.getEventDetails);
router.post('/:id/register', eventController.registerForEvent);

// Protected Routes
router.post('/', verifyToken, eventController.createEvent);
router.get('/', verifyToken, eventController.getEvents);
router.put('/:id/live', verifyToken, eventController.makeEventLive);
router.get('/:id/registrations', verifyToken, eventController.getEventRegistrations);
router.put('/:id', verifyToken, eventController.updateEvent);
router.delete('/:id', verifyToken, eventController.deleteEvent);

module.exports = router;
