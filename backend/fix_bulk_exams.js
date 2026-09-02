const mongoose = require('mongoose');
require('dotenv').config();
const Exam = require('./src/models/Exam');
const Event = require('./src/models/Event');
const connectDB = require('./src/config/db');

const fixExams = async () => {
  try {
    await connectDB();
    console.log('Database connected.');

    // Remove event_id from all bulk exams
    const result = await Exam.updateMany(
      { title: { $regex: /^Bulk Exam / } },
      { $unset: { event_id: "" } }
    );
    console.log(`Updated ${result.modifiedCount} exams to be Academic Exams (removed event_id).`);

    // Optionally delete the Bulk Event we created earlier
    const eventResult = await Event.deleteMany({ title: 'Bulk Exam Event' });
    console.log(`Deleted ${eventResult.deletedCount} mock bulk events.`);

    console.log('Done fixing exams.');
    process.exit(0);
  } catch (error) {
    console.error('Error during fixing:', error);
    process.exit(1);
  }
};

fixExams();
