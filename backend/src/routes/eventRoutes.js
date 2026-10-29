const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { verifyToken, optionalAuth } = require('../middleware/authMiddleware');

// Protected Stats & Registrations Routes
router.get('/my-registrations', verifyToken, eventController.getMyRegistrations);
router.post('/bulk-delete', verifyToken, eventController.bulkDeleteEvents);

// Public / Optional Auth Routes
router.get('/:id', optionalAuth, eventController.getEventDetails);
router.post('/:id/register', optionalAuth, eventController.registerForEvent);

// Protected Routes
router.post('/', verifyToken, eventController.createEvent);
router.get('/', verifyToken, eventController.getEvents);
router.get('/:id/registrations', verifyToken, eventController.getEventRegistrations);
router.put('/:id', verifyToken, eventController.updateEvent);
router.delete('/:id', verifyToken, eventController.deleteEvent);

module.exports = router;
