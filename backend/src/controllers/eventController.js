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
    if (req.user.role === 'admin' || req.user.role === 'teacher') {
      events = await Event.find().sort({ created_at: -1 }).lean();
    } else if (req.user.role === 'student') {
      events = await Event.find({ status: 'live' }).sort({ event_date: 1 }).lean();
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
    if (!name || !email || !phone) {
      return res.status(400).json({ message: 'Name, email, and phone are required.' });
    }

    const event = await Event.findById(req.params.id);
    if (!event || event.status !== 'live') {
      return res.status(404).json({ message: 'Event not found or not live' });
    }

    // Check existing registration by email
    const existingReg = await EventRegistration.findOne({ event_id: event._id, email });
    if (existingReg) {
      return res.status(400).json({ message: 'Already registered with this email' });
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

exports.updateEvent = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    const { title, description, event_date, end_date, image, status } = req.body;
    
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (title) event.title = title;
    if (description) event.description = description;
    if (event_date) event.event_date = event_date;
    if (end_date) event.end_date = end_date;
    if (image !== undefined) event.image = image;
    if (status) event.status = status;

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
    
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Optional: Delete associated registrations? 
    await EventRegistration.deleteMany({ event_id: req.params.id });

    return res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting event' });
  }
};
