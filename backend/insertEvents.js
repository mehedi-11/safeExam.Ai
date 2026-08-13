require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('./src/models/Event');
const Admin = require('./src/models/Admin');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const admin = await Admin.findOne();
    if (!admin) {
      console.log('No admin found!');
      process.exit(1);
    }

    const events = [];
    const now = new Date();

    for (let i = 1; i <= 5; i++) {
      const startDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000); // i days from now
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours after start
      
      events.push({
        title: `Dummy Event ${i}: Midterm Examination`,
        description: `This is a description for dummy event ${i}. Please prepare accordingly. Topics include chapters 1 through ${i}.`,
        event_date: startDate,
        end_date: endDate,
        image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        created_by_model: 'Admin',
        created_by: admin._id,
        status: i % 2 === 0 ? 'live' : 'live'
      });
    }

    await Event.insertMany(events);
    console.log('5 events successfully inserted.');
    
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

run();
