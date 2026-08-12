const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');

exports.createEvent = async (req, res) => {
  try {
    const { title, description, event_date, end_date, image } = req.body;
    
    if (!title || !description || !event_date || !end_date) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const newEvent = new Event({
      title,
      description,
      event_date,
      end_date,
      image: image || '',
      status: 'live',
      created_by_model: req.user.role === 'admin' ? 'Admin' : 'Teacher',
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
      events = await Event.find().sort({ created_at: -1 });
    } else if (req.user.role === 'teacher') {
      // Teachers might only see their own events or all. Let's say they see all for now, or just their own.
      // Usually, teachers might collaborate. Let's give them all events.
      events = await Event.find().sort({ created_at: -1 });
    } else if (req.user.role === 'student') {
      events = await Event.find({ status: 'live' }).sort({ event_date: 1 });
    }
    return res.json(events);
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
    if (req.user.role === 'student') {
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
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can register' });
    }

    const event = await Event.findById(req.params.id);
    if (!event || event.status !== 'live') {
      return res.status(404).json({ message: 'Event not found or not live' });
    }

    const existingReg = await EventRegistration.findOne({ event_id: event._id, student_id: req.user.id });
    if (existingReg) {
      return res.status(400).json({ message: 'Already registered' });
    }

    const reg = new EventRegistration({
      event_id: event._id,
      student_id: req.user.id
    });
    await reg.save();

    return res.json({ message: 'Registered successfully', registration: reg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error registering for event' });
  }
};

exports.getEventRegistrations = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    const regs = await EventRegistration.find({ event_id: req.params.id }).populate('student_id', 'name email id');
    return res.json(regs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching registrations' });
  }
};
