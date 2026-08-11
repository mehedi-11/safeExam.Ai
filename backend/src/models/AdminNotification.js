const mongoose = require('mongoose');
const adminNotificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info' },
  is_read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});
module.exports = mongoose.model('AdminNotification', adminNotificationSchema);