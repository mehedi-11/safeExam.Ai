const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const Exam = require('../models/Exam');
const Student = require('../models/Student');
const StudentExam = require('../models/StudentExam');

exports.createEvent = async (req, res) => {
  try {
    if (req.user && req.user.role === 'admin') {
      return res.status(403).json({ message: 'Admins are not allowed to create events.' });
    }

    const { title, description, event_date, image } = req.body;
    
    if (!title || !description || !event_date) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const newEvent = new Event({
      title,
      description,
      event_date,
      image: image || '',
      status: 'live',
      created_by_model: 'Teacher',
      created_by: req.user.id
    });

    await newEvent.save();
    return res.status(201).json({ message: 'Event created successfully', event: newEvent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating event' });
  }
};

exports.getEvents = async (req, res) => {
  try {
    let events = [];
    if (req.user.role === 'admin') {
      events = await Event.find().sort({ created_at: -1, _id: -1 }).lean();
    } else if (req.user.role === 'teacher') {
      events = await Event.find({ created_by: req.user.id }).sort({ created_at: -1, _id: -1 }).lean();
    } else if (req.user.role === 'student') {
      events = await Event.find({ status: 'live' }).sort({ created_at: -1, _id: -1 }).lean();
    }

    // Attach registration count
    const eventsWithCounts = await Promise.all(events.map(async (evt) => {
      const count = await EventRegistration.countDocuments({ event_id: evt._id });
      return { ...evt, registration_count: count };
    }));

    return res.json(eventsWithCounts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching events' });
  }
};

exports.makeEventLive = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    
    if (req.user.role === 'teacher' && event.created_by.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized: You can only manage your own events' });
    }

    event.status = 'live';
    await event.save();
    return res.json({ message: 'Event is now live', event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error making event live' });
  }
};

exports.getEventDetails = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    let isRegistered = false;
    if (req.user && req.user.role === 'student') {
      const reg = await EventRegistration.findOne({ event_id: event._id, student_id: req.user.id });
      if (reg) isRegistered = true;
    }

    return res.json({ event, isRegistered });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching event details' });
  }
};

exports.registerForEvent = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email) {
      return res.json({ success: false, message: 'Name and email are required.' });
    }

    const event = await Event.findById(req.params.id);
    if (!event || event.status !== 'live') {
      return res.json({ success: false, message: 'Event not found or not live' });
    }

    // Check existing registration by email
    const existingReg = await EventRegistration.findOne({ event_id: event._id, email });
    if (existingReg) {
      return res.json({ success: false, message: 'Already registered with this email' });
    }

    // Generate a 6 digit security code
    const security_code = Math.floor(100000 + Math.random() * 900000).toString();

    const reg = new EventRegistration({
      event_id: event._id,
      student_id: req.user ? req.user.id : undefined,
      name,
      email,
      phone,
      security_code
    });
    await reg.save();

    return res.json({ success: true, message: 'Registered successfully', registration: reg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error registering for event' });
  }
};

exports.getEventRegistrations = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    
    if (req.user.role === 'teacher' && event.created_by.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized: You can only view your own events' });
    }

    const regs = await EventRegistration.find({ event_id: req.params.id }).sort({ registration_date: -1, _id: -1 });
    return res.json(regs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching registrations' });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    const { title, description, event_date, image, status } = req.body;
    
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (req.user.role === 'teacher' && event.created_by.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized: You can only update your own events' });
    }

    if (req.user.role === 'admin') {
      if (status) event.status = status;
    } else {
      if (title) event.title = title;
      if (description) event.description = description;
      if (event_date) event.event_date = event_date;
      if (image !== undefined) event.image = image;
      if (status) event.status = status;
    }

    await event.save();
    return res.json({ message: 'Event updated successfully', event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating event' });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (req.user.role === 'teacher' && event.created_by.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized: You can only delete your own events' });
    }
    
    await Event.findByIdAndDelete(req.params.id);

    // Optional: Delete associated registrations? 
    await EventRegistration.deleteMany({ event_id: req.params.id });
    await Exam.updateMany({ event_id: req.params.id }, { $unset: { event_id: "" } });
    return res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting event' });
  }
};



exports.bulkDeleteEvents = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { eventIds } = req.body;
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({ message: 'No event IDs provided' });
    }

    let filter = { _id: { $in: eventIds } };
    if (req.user.role === 'teacher') {
      filter.created_by = req.user.id;
    }

    const eventsToDelete = await Event.find(filter);
    const deletableIds = eventsToDelete.map(e => e._id);

    if (deletableIds.length === 0) {
      return res.status(404).json({ message: 'No authorized events found to delete' });
    }

    const result = await Event.deleteMany({ _id: { $in: deletableIds } });
    await EventRegistration.deleteMany({ event_id: { $in: deletableIds } });
    await Exam.updateMany({ event_id: { $in: deletableIds } }, { $unset: { event_id: "" } });

    return res.json({
      message: `${result.deletedCount} event(s) deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error('Error bulk deleting events:', err);
    return res.status(500).json({ message: 'Server error deleting events' });
  }
};

exports.getEventStats = async (req, res) => {
  try {
    let matchQuery = {};
    if (req.user && req.user.role === 'teacher') {
      matchQuery = { created_by: new mongoose.Types.ObjectId(req.user.id) };
    }

    const totalEvents = await Event.countDocuments(matchQuery);
    const liveEvents = await Event.countDocuments({ ...matchQuery, status: 'live' });
    const closedEvents = await Event.countDocuments({ ...matchQuery, status: 'closed' });

    const events = await Event.find(matchQuery).sort({ created_at: -1 }).lean();
    const eventIds = events.map(e => e._id);

    const totalRegistrations = await EventRegistration.countDocuments({ event_id: { $in: eventIds } });
    const totalAttended = await EventRegistration.countDocuments({ event_id: { $in: eventIds }, status: 'attended' });

    const eventsWithStats = await Promise.all(events.map(async (evt) => {
      const regCount = await EventRegistration.countDocuments({ event_id: evt._id });
      const attendedCount = await EventRegistration.countDocuments({ event_id: evt._id, status: 'attended' });
      return {
        ...evt,
        id: evt._id,
        registration_count: regCount,
        attended_count: attendedCount
      };
    }));

    return res.json({
      totalEvents,
      liveEvents,
      closedEvents,
      totalRegistrations,
      totalAttended,
      events: eventsWithStats
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching event statistics' });
  }
};

exports.getMyRegistrations = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const studentId = req.user.id;
    let studentEmail = req.user.email;

    if (!studentEmail) {
      const student = await Student.findOne({ id: studentId });
      if (student) {
        studentEmail = student.email;
      }
    }

    const queryConditions = [];
    if (studentId) queryConditions.push({ student_id: studentId });
    if (studentEmail) queryConditions.push({ email: studentEmail.toLowerCase() });

    const registrations = await EventRegistration.find(
      queryConditions.length > 0 ? { $or: queryConditions } : { student_id: studentId }
    ).populate('event_id').sort({ registration_date: -1, _id: -1 }).lean();

    const now = new Date();

    const registeredEventsWithExam = await Promise.all(registrations.map(async (reg) => {
      const event = reg.event_id;
      if (!event) return null;

      // Find any exam created under this event
      const exam = await Exam.findOne({ event_id: event._id }).lean();
      
      let examInfo = null;
      if (exam) {
        let isLive = Boolean(exam.is_live);
        let isEnded = false;

        if (exam.exam_date) {
          const examDate = new Date(exam.exam_date);
          const durationMs = ((exam.duration_minutes || 60) + 5) * 60000;
          const expireTime = new Date(examDate.getTime() + durationMs);
          if (now > expireTime) {
            isEnded = true;
            isLive = false;
          }
        }

        // Check if student has an existing attempt
        const existingAttempt = await StudentExam.findOne({
          student_id: studentId,
          exam_id: exam._id
        }).sort({ started_at: -1 }).lean();

        examInfo = {
          _id: exam._id,
          title: exam.title,
          duration_minutes: exam.duration_minutes,
          total_marks: exam.total_marks,
          exam_password: exam.exam_password || null,
          is_live: isLive,
          is_ended: isEnded,
          exam_date: exam.exam_date,
          attempt_status: existingAttempt ? existingAttempt.status : null,
          score: existingAttempt ? existingAttempt.score : null
        };
      }

      return {
        _id: reg._id,
        registration_date: reg.registration_date,
        registered_name: reg.name,
        registered_email: reg.email,
        security_code: reg.security_code,
        event: {
          _id: event._id,
          title: event.title,
          description: event.description,
          event_date: event.event_date,
          image: event.image,
          status: event.status
        },
        exam: examInfo
      };
    }));

    const validRegistrations = registeredEventsWithExam.filter(r => r !== null);
    return res.json(validRegistrations);
  } catch (err) {
    console.error('Error fetching registered events:', err);
    return res.status(500).json({ message: 'Server error fetching registered events' });
  }
};

