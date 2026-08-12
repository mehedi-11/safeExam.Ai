const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  event_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  image: { type: String, default: '' },
  created_by_model: { type: String, required: true, enum: ['Admin', 'Teacher'] },
  created_by: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'created_by_model' },
  status: { type: String, enum: ['live', 'closed'], default: 'live' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', eventSchema);
