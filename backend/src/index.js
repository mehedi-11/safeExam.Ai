const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const studentRoutes = require('./routes/studentRoutes');
const proctorRoutes = require('./routes/proctorRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded profile images as static assets
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/proctor', proctorRoutes);

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

  // Background worker to auto-stop exams
  const db = require('./config/db');
  setInterval(async () => {
    try {
      const [result] = await db.query(`
        UPDATE exams 
        SET is_live = 0 
        WHERE is_live = 1 
        AND NOW() > DATE_ADD(exam_date, INTERVAL (duration_minutes + 5) MINUTE)
      `);
      if (result.affectedRows > 0) {
        console.log(`[Auto-Stop] Stopped ${result.affectedRows} exam(s) that exceeded their duration.`);
      }
    } catch (err) {
      console.error('[Auto-Stop] Error checking exams:', err.message);
    }
  }, 60000); // Check every 60 seconds
});
