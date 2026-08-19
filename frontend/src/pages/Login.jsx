import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import emailjs from '@emailjs/browser';
import { KeyRound, Mail, UserSquare, ShieldAlert, ArrowLeft, Eye, EyeOff, Lock, CheckCircle2 } from 'lucide-react';

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
  const [resetEmail, setResetEmail] = useState('');
  const [resetName, setResetName] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
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
    if (role === 'admin') return 'System Admin';
    if (role === 'teacher') return 'Teacher Console';
    return 'Student Portal';
  };

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
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
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
        // Verify identifier and get email
        const res = await api.post('/auth/verify-identifier', { role, identifier: resetIdentifier });
        const { email, name } = res.data;
        setResetEmail(email);
        setResetName(name);

        // Send OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(otp);

        const templateParams = {
          to_name: name,
          email: email,
          otp: otp
        };

        await emailjs.send(
          'service_1xya9pm',
          'template_tex9fhq',
          templateParams,
          { publicKey: 'bUF4GpGI4G1vouutS' }
        );

        setSuccess('OTP has been sent to your registered email.');
        setResetStep(2);
      } else if (resetStep === 2) {
        if (enteredOtp !== generatedOtp) {
          setError('Invalid OTP. Please try again.');
        } else {
          setSuccess('');
          setResetStep(3);
        }
      } else if (resetStep === 3) {
        await api.post('/auth/reset-password', {
          role,
          identifier: resetIdentifier,
          newPassword
        });
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 relative overflow-hidden">
          {/* Accent decoration */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-tomato-500"></div>

          {/* Removed Back button */}

          {/* Role Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
            <button 
              onClick={() => navigate('/login/admin')}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${role === 'admin' ? 'bg-white text-dark-900 shadow-sm' : 'text-gray-500 hover:text-dark-900'}`}
            >
              Admin
            </button>
            <button 
              onClick={() => navigate('/login/teacher')}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${role === 'teacher' ? 'bg-white text-dark-900 shadow-sm' : 'text-gray-500 hover:text-dark-900'}`}
            >
              Teacher
            </button>
            <button 
              onClick={() => navigate('/login/student')}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${role === 'student' ? 'bg-white text-dark-900 shadow-sm' : 'text-gray-500 hover:text-dark-900'}`}
            >
              Student
            </button>
          </div>

          <h2 className="text-2xl font-bold text-dark-900 mb-2">{getRoleTitle()}</h2>
          <p className="text-xs text-gray-400 mb-6">Enter your authorized credentials to gain portal access.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-start gap-2 mb-6 animate-fade-in">
              <ShieldAlert size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-xs flex items-start gap-2 mb-6 animate-fade-in">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {!resetMode ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {role === 'student' ? (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Student ID <span className="text-red-500 ml-1">*</span></label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                      <UserSquare size={18} />
                    </span>
                    <input
                      type="text"
                      name="studentId"
                      value={formData.studentId}
                      onChange={handleChange}
                      required
                      placeholder="e.g. STU1001"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-tomato-500 focus:ring-1 focus:ring-tomato-500 smooth-transition"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Email Address <span className="text-red-500 ml-1">*</span></label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                      <Mail size={18} />
                    </span>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-tomato-500 focus:ring-1 focus:ring-tomato-500 smooth-transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Password <span className="text-red-500 ml-1">*</span></label>
                  <button type="button" onClick={() => { setResetMode(true); setError(''); setSuccess(''); }} className="text-xs font-semibold text-tomato-500 hover:text-tomato-600 smooth-transition">
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                    <KeyRound size={18} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-tomato-500 focus:ring-1 focus:ring-tomato-500 smooth-transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-tomato-500 smooth-transition"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="tomato-btn w-full py-3 mt-4"
              >
                {loading ? 'Processing...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-5 animate-fade-in">
              {resetStep === 1 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    {role === 'student' ? 'Enter Student ID' : 'Enter Email Address'} <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                      {role === 'student' ? <UserSquare size={18} /> : <Mail size={18} />}
                    </span>
                    <input
                      type={role === 'student' ? 'text' : 'email'}
                      value={resetIdentifier}
                      onChange={(e) => { setResetIdentifier(e.target.value); setError(''); }}
                      required
                      placeholder={role === 'student' ? 'e.g. STU1001' : 'name@example.com'}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-tomato-500 focus:ring-1 focus:ring-tomato-500 smooth-transition"
                    />
                  </div>
                </div>
              )}

              {resetStep === 2 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Enter 6-Digit OTP <span className="text-red-500 ml-1">*</span></label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                      <Lock size={18} />
                    </span>
                    <input
                      type="text"
                      maxLength="6"
                      value={enteredOtp}
                      onChange={(e) => { setEnteredOtp(e.target.value); setError(''); }}
                      required
                      placeholder="XXXXXX"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-tomato-500 focus:ring-1 focus:ring-tomato-500 smooth-transition font-mono tracking-widest text-center"
                    />
                  </div>
                </div>
              )}

              {resetStep === 3 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">New Password <span className="text-red-500 ml-1">*</span></label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                      <KeyRound size={18} />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                      required
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-tomato-500 focus:ring-1 focus:ring-tomato-500 smooth-transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-tomato-500 smooth-transition"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="tomato-btn w-full py-3 mt-4"
              >
                {loading ? 'Processing...' : (resetStep === 1 ? 'Send OTP' : (resetStep === 2 ? 'Verify OTP' : 'Reset Password'))}
              </button>

              <div className="text-center mt-4">
                <button 
                  type="button" 
                  onClick={() => { setResetMode(false); setResetStep(1); setError(''); setSuccess(''); }} 
                  className="text-xs font-semibold text-gray-500 hover:text-tomato-500 smooth-transition"
                >
                  Cancel and go back to Login
                </button>
              </div>
            </form>
          )}

          {!resetMode && role !== 'admin' && (
            <div className="text-center mt-6">
              <span className="text-xs text-gray-400">Don't have an account? </span>
              <Link to={`/register/${role}`} className="text-xs font-semibold text-tomato-500 hover:text-tomato-600 hover:underline smooth-transition">
                Register Request
              </Link>
            </div>
          )}

          {blockTimeLeft > 0 && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in border border-red-100 rounded-2xl">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                <ShieldAlert size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Access Temporarily Blocked</h3>
              <p className="text-sm text-gray-600 mb-4">You have entered an incorrect password too many times. Please wait before trying again.</p>
              <div className="text-3xl font-mono font-bold text-tomato-500 tracking-wider">
                {formatTime(blockTimeLeft)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
