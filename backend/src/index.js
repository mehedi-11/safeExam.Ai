const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const Exam = require('./models/Exam');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const studentRoutes = require('./routes/studentRoutes');
const proctorRoutes = require('./routes/proctorRoutes');
const eventRoutes = require('./routes/eventRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Serve uploaded profile images as static assets
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/proctor', proctorRoutes);
app.use('/api/events', eventRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Online Exam taking API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Something broke on the server!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  // Background worker to auto-stop and auto-manage exams
  setInterval(async () => {
    try {
      const now = new Date();
      // Find all live exams
      const liveExams = await Exam.find({ is_live: true });
      let stoppedCount = 0;
      
      for (const exam of liveExams) {
        if (!exam.exam_date) continue;
        const examTime = new Date(exam.exam_date).getTime();
        if (isNaN(examTime)) continue;

        const duration = exam.duration_minutes || 60;
        const endTime = new Date(examTime + (duration + 5) * 60000);
        if (now > endTime) {
          exam.is_live = false;
          await exam.save();
          stoppedCount++;
        }
      }
      
      if (stoppedCount > 0) {
        console.log(`[Auto-Stop] Stopped ${stoppedCount} exam(s) that exceeded their duration.`);
      }

      // Auto-start Event Exams within their scheduled active window
      const offlineEventExams = await Exam.find({ is_live: false, event_id: { $exists: true, $ne: null } }).populate('event_id');
      let startedCount = 0;
      
      for (const exam of offlineEventExams) {
        if (exam.event_id && exam.event_id.status === 'live' && exam.event_id.event_date) {
          const eventStartTime = new Date(exam.event_id.event_date);
          const duration = exam.duration_minutes || 60;
          const examEndTime = new Date(eventStartTime.getTime() + (duration + 5) * 60000);

          if (now >= eventStartTime && now < examEndTime) {
            exam.is_live = true;
            await exam.save();
            startedCount++;
          }
        }
      }

      if (startedCount > 0) {
        console.log(`[Auto-Start] Started ${startedCount} event exam(s) within active scheduled window.`);
      }

    } catch (err) {
      console.error('[Auto-Job] Error checking exams:', err.message);
    }
  }, 60000); // Check every 60 seconds
});
