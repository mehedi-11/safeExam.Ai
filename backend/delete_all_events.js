const mongoose = require('mongoose');
require('dotenv').config();
const Event = require('./src/models/Event');
const connectDB = require('./src/config/db');

const deleteAllEvents = async () => {
  try {
    await connectDB();
    console.log('Database connected.');

    const result = await Event.deleteMany({});
    console.log(`Deleted ${result.deletedCount} events.`);

    console.log('All events deleted successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error during deletion:', error);
    process.exit(1);
  }
};

deleteAllEvents();
