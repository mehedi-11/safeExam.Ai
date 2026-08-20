import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ExamInterface from './pages/ExamInterface';
import EventDetails from './pages/EventDetails';
import TeacherProctoring from './pages/TeacherProctoring';

// Protected Route Guard
const ProtectedRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || !user.role) {
    return <Navigate to="/" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/login/student" replace />} />
        <Route path="/login/:role" element={<Login />} />
        <Route path="/register/:role" element={<Register />} />

        {/* Admin Dashboard */}
        <Route 
          path="/dashboard/admin" 
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Teacher Dashboard */}
        <Route 
          path="/dashboard/teacher" 
          element={
            <ProtectedRoute allowedRole="teacher">
              <TeacherDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Student Dashboard */}
        <Route 
          path="/dashboard/student" 
          element={
            <ProtectedRoute allowedRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Student Exam Workspace */}
        <Route 
          path="/exam/:examId" 
          element={
            <ProtectedRoute allowedRole="student">
              <ExamInterface />
            </ProtectedRoute>
          } 
        />

        {/* Event Details */}
        <Route 
          path="/event/:id" 
          element={
            <ProtectedRoute allowedRole="student">
              <EventDetails />
            </ProtectedRoute>
          } 
        />

        {/* Teacher Proctoring */}
        <Route 
          path="/teacher/exam/:examId/proctor" 
          element={
            <ProtectedRoute allowedRole="teacher">
              <TeacherProctoring />
            </ProtectedRoute>
          } 
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
