import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { 
  KeyRound, Mail, UserSquare, ShieldAlert, Eye, EyeOff, Lock, CheckCircle2, 
  Loader2, BookOpen
} from 'lucide-react';

export default function Login() {
  const { role } = useParams(); // 'admin', 'teacher', 'student'
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    studentId: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Block State
  const [blockTimeLeft, setBlockTimeLeft] = useState(0);

  // Reset Password State
  const [resetMode, setResetMode] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    let timer;
    if (blockTimeLeft > 0) {
      timer = setTimeout(() => setBlockTimeLeft(blockTimeLeft - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [blockTimeLeft]);

  // Reset states when changing roles/tabs
  useEffect(() => {
    setBlockTimeLeft(0);
    setError('');
    setSuccess('');
    setFormData({ email: '', studentId: '', password: '' });
    setResetMode(false);
  }, [role]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getRoleTitle = () => {
    if (role === 'admin') return 'Admin Sign In';
    if (role === 'teacher') return 'Teacher Sign In';
    return 'Student Sign In';
  };

  const getRoleVisual = () => {
    if (role === 'admin') {
      return {
        gif: '/admin-character.gif',
        alt: 'Admin Cybersecurity & System Monitoring',
        badge: 'Administrator',
        badgeColor: 'bg-red-50 text-red-600 border-red-200',
        subtitle: 'System Control & Threat Defense'
      };
    }
    if (role === 'teacher') {
      return {
        gif: '/teacher-character.gif',
        alt: 'Teacher Classroom & Evaluation',
        badge: 'Teacher / Examiner',
        badgeColor: 'bg-blue-50 text-blue-600 border-blue-200',
        subtitle: 'Curriculum & Question Evaluation'
      };
    }
    return {
      gif: '/student-character.gif',
      alt: 'Student Examination Workspace',
      badge: 'Student / Candidate',
      badgeColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      subtitle: 'Smart & Secure Examination'
    };
  };

  const roleVisual = getRoleVisual();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let endpoint = '';
    let payload = {};

    if (role === 'admin') {
      endpoint = '/auth/login/admin';
      payload = { email: formData.email, password: formData.password };
    } else if (role === 'teacher') {
      endpoint = '/auth/login/teacher';
      payload = { email: formData.email, password: formData.password };
    } else {
      endpoint = '/auth/login/student';
      payload = { studentId: formData.studentId, password: formData.password };
    }

    try {
      const response = await api.post(endpoint, payload);

      if (response.data.success === false) {
        if (response.data.blocked_until) {
          const blockEnd = new Date(response.data.blocked_until).getTime();
          const now = new Date().getTime();
          const diff = Math.floor((blockEnd - now) / 1000);
          if (diff > 0) {
            setBlockTimeLeft(diff);
          }
        }
        setError(response.data.message || 'Invalid credentials');
        return;
      }

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('role', role);
      
      // Navigate to corresponding dashboard
      navigate(`/dashboard/${role}`);
    } catch (err) {
      if (err.response?.data?.blocked_until) {
        const blockEnd = new Date(err.response.data.blocked_until).getTime();
        const now = new Date().getTime();
        const diff = Math.floor((blockEnd - now) / 1000);
        if (diff > 0) {
          setBlockTimeLeft(diff);
        }
      }
      setError(err.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (resetStep === 1) {
        // Verify identifier and request OTP from backend
        const res = await api.post('/auth/verify-identifier', { role, identifier: resetIdentifier });
        if (res.data.success === false) {
          setError(res.data.message || 'Account not found');
          return;
        }

        setSuccess('OTP has been sent to your registered Gmail.');
        setResetStep(2);
      } else if (resetStep === 2) {
        if (!enteredOtp || enteredOtp.trim().length === 0) {
          setError('Please enter the OTP sent to your email.');
          setLoading(false);
          return;
        }

        // Verify OTP securely with backend
        const res = await api.post('/auth/verify-reset-otp', {
          role,
          identifier: resetIdentifier,
          otp: enteredOtp.trim()
        });

        if (res.data.success === false) {
          setError(res.data.message || 'Invalid or expired OTP');
          return;
        }

        setError('');
        setSuccess('');
        setResetStep(3);
      } else if (resetStep === 3) {
        const res = await api.post('/auth/reset-password', {
          role,
          identifier: resetIdentifier,
          newPassword,
          resetToken: enteredOtp.trim()
        });

        if (res.data.success === false) {
          setError(res.data.message || 'Error resetting password');
          return;
        }

        setSuccess('Password reset successfully! You can now sign in.');
        setTimeout(() => {
          setResetMode(false);
          setResetStep(1);
          setResetIdentifier('');
          setEnteredOtp('');
          setNewPassword('');
          setSuccess('');
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Centered Split Card */}
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 max-w-4xl w-full border border-gray-100 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* LEFT COLUMN: Role-specific Animated Workspace & Branding */}
        <div className="md:w-5/12 bg-gradient-to-b from-slate-50 via-gray-50 to-orange-50/20 p-8 sm:p-10 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-gray-100 shrink-0">
          <div className="w-full max-w-[280px] overflow-hidden rounded-2xl shadow-sm border border-gray-200/70 bg-white p-2">
            <img 
              key={role}
              src={roleVisual.gif} 
              alt={roleVisual.alt} 
              className="w-full h-44 sm:h-48 object-contain rounded-xl select-none transition-all duration-300"
            />
          </div>

          <div className="mt-4 flex items-center justify-center">
            <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border ${roleVisual.badgeColor}`}>
              {roleVisual.badge}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-3 font-black text-2xl text-gray-900 tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center shadow-sm">
              <BookOpen size={16} />
            </div>
            <span>SExam<span className="text-tomato-500">.AI</span></span>
          </div>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            {roleVisual.subtitle}
          </p>
        </div>

        {/* RIGHT COLUMN: Clean Login Form */}
        <div className="flex-1 p-8 sm:p-10 flex flex-col justify-center">
          {/* Role Tabs Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-xl mb-6 border border-gray-200/80">
            <button 
              type="button"
              onClick={() => navigate('/login/admin')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                role === 'admin' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Admin
            </button>
            <button 
              type="button"
              onClick={() => navigate('/login/teacher')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                role === 'teacher' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Teacher
            </button>
            <button 
              type="button"
              onClick={() => navigate('/login/student')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                role === 'student' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Student
            </button>
          </div>

          {/* Form Header */}
          <div className="mb-5">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {getRoleTitle()}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Enter your credentials to continue to the portal.
            </p>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-start gap-2 mb-4 animate-fade-in">
              <ShieldAlert size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs flex items-start gap-2 mb-4 animate-fade-in">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Normal Login Form */}
          {!resetMode ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {role === 'student' ? (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Student ID <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                      <UserSquare size={17} />
                    </span>
                    <input
                      type="text"
                      name="studentId"
                      value={formData.studentId}
                      onChange={handleChange}
                      required
                      placeholder="e.g. STU1001"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all placeholder:text-gray-400 font-medium"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                      <Mail size={17} />
                    </span>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all placeholder:text-gray-400 font-medium"
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <button 
                    type="button" 
                    onClick={() => { setResetMode(true); setError(''); setSuccess(''); }} 
                    className="text-xs font-semibold text-tomato-500 hover:text-tomato-700 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                    <KeyRound size={17} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all placeholder:text-gray-400 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 text-sm font-bold text-white bg-gray-900 hover:bg-gray-800 active:scale-[0.99] rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer"
              >
                {loading && <Loader2 className="animate-spin shrink-0" size={17} />}
                <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              </button>
            </form>
          ) : (
            /* Forgot Password Flow */
            <form onSubmit={handleResetSubmit} className="space-y-4 animate-fade-in">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
                Follow the security steps to verify identity and reset your password.
              </div>

              {resetStep === 1 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    {role === 'student' ? 'Enter Student ID' : 'Enter Email Address'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                      {role === 'student' ? <UserSquare size={17} /> : <Mail size={17} />}
                    </span>
                    <input
                      type={role === 'student' ? 'text' : 'email'}
                      value={resetIdentifier}
                      onChange={(e) => { setResetIdentifier(e.target.value); setError(''); }}
                      required
                      placeholder={role === 'student' ? 'e.g. STU1001' : 'name@example.com'}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all font-medium"
                    />
                  </div>
                </div>
              )}

              {resetStep === 2 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Enter 6-Digit OTP <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                      <Lock size={17} />
                    </span>
                    <input
                      type="text"
                      maxLength="6"
                      value={enteredOtp}
                      onChange={(e) => { setEnteredOtp(e.target.value.replace(/[^0-9]/g, '')); setError(''); }}
                      required
                      placeholder="XXXXXX"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all font-mono tracking-widest text-center text-lg"
                    />
                  </div>
                </div>
              )}

              {resetStep === 3 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                      <KeyRound size={17} />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                      required
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 text-sm font-bold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer"
              >
                {loading && <Loader2 className="animate-spin shrink-0" size={17} />}
                <span>
                  {loading 
                    ? 'Processing...' 
                    : (resetStep === 1 ? 'Send Verification OTP' : (resetStep === 2 ? 'Verify OTP' : 'Update Password'))}
                </span>
              </button>

              <div className="text-center mt-2">
                <button 
                  type="button" 
                  onClick={() => { setResetMode(false); setResetStep(1); setError(''); setSuccess(''); }} 
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Cancel and go back to Login
                </button>
              </div>
            </form>
          )}

          {/* Registration Link Footer */}
          {!resetMode && role !== 'admin' && (
            <div className="text-center pt-3 border-t border-gray-100 mt-4">
              <p className="text-xs text-gray-500">
                Don't have an account?{' '}
                <Link 
                  to={`/register/${role}`} 
                  className="font-bold text-tomato-500 hover:text-tomato-700 hover:underline transition-colors"
                >
                  Register
                </Link>
              </p>
            </div>
          )}

          {/* Temporary Block Overlay */}
          {blockTimeLeft > 0 && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in border border-red-100 rounded-2xl">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 border border-red-200">
                <ShieldAlert size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Access Temporarily Suspended</h3>
              <p className="text-xs text-gray-500 mb-4 max-w-xs">
                Too many invalid attempts. Please wait before trying again.
              </p>
              <div className="text-3xl font-mono font-black text-red-600 tracking-wider">
                {formatTime(blockTimeLeft)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
