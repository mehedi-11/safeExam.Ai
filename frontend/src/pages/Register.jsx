import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import emailjs from '@emailjs/browser';
import { UserSquare, Mail, KeyRound, ArrowLeft, ShieldAlert, BadgeCheck, Eye, EyeOff } from 'lucide-react';
import Navbar from '../components/Navbar';

export default function Register() {
  const { role } = useParams(); // 'teacher', 'student'
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    id: '', // Student ID
    name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // OTP States
  const [otpStep, setOtpStep] = useState(1); // 1 = Form, 2 = OTP Verification
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // If in Step 1, generate OTP and send via EmailJS
    if (otpStep === 1) {
      try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(otp);

        const templateParams = {
          to_name: formData.name,
          to_email: formData.email,
          email: formData.email, // Required by the "To Email" field in your template
          otp: otp
        };

        await emailjs.send(
          'service_1xya9pm',
          'template_4db7mzc',
          templateParams,
          {
            publicKey: 'bUF4GpGI4G1vouutS',
          }
        );

        setOtpStep(2);
        // Do not set success here, otherwise it hides the OTP form!
      } catch (err) {
        setError('Failed to send OTP. Please check your email or try again later.');
        console.error('EmailJS Error:', err);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Verify OTP if in Step 2
    if (otpStep === 2) {
      if (enteredOtp !== generatedOtp) {
        setError('Invalid OTP. Please try again.');
        setLoading(false);
        return;
      }
      setSuccess(''); // Clear success message from OTP step
    }

    // Final API call for registration
    let endpoint = '';
    let payload = {};

    if (role === 'teacher') {
      endpoint = '/auth/register/teacher';
      payload = { name: formData.name, email: formData.email, password: formData.password };
    } else {
      endpoint = '/auth/register/student';
      payload = { id: formData.id, name: formData.name, email: formData.email, password: formData.password };
    }

    try {
      const response = await api.post(endpoint, payload);
      setSuccess(response.data.message);
      setFormData({ id: '', name: '', email: '', password: '' });
      setOtpStep(1); // Reset step
      setEnteredOtp('');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please review credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 relative overflow-hidden">
          {/* Accent decoration */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-tomato-500"></div>

          {/* Back button */}
          <button 
            onClick={() => navigate('/')} 
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-tomato-500 mb-6 smooth-transition"
          >
            <ArrowLeft size={14} />
            <span>Back to portals</span>
          </button>

          <h2 className="text-2xl font-bold text-dark-900 mb-2">
            Register as {role === 'teacher' ? 'Teacher' : 'Student'}
          </h2>
          <p className="text-xs text-gray-400 mb-6">
            Submit a registration request to the system admin for approval.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-start gap-2 mb-6 animate-fade-in">
              <ShieldAlert size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl text-xs flex flex-col gap-2 mb-6 animate-fade-in">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <BadgeCheck size={18} className="text-green-600 shrink-0" />
                <span>Request Submitted!</span>
              </div>
              <p className="text-green-600 leading-normal">{success}</p>
              <Link to={`/login/${role}`} className="tomato-btn py-2 text-center text-xs mt-2 w-full">
                Go to Sign In
              </Link>
            </div>
          )}

          {!success && otpStep === 1 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {role === 'student' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Student ID</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                      <UserSquare size={18} />
                    </span>
                    <input
                      type="text"
                      name="id"
                      value={formData.id}
                      onChange={handleChange}
                      required
                      placeholder="e.g. STU1002"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-tomato-500 focus:ring-1 focus:ring-tomato-500 smooth-transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                    <UserSquare size={18} />
                  </span>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g. John Smith"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-tomato-500 focus:ring-1 focus:ring-tomato-500 smooth-transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Email Address</label>
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
                    placeholder="e.g. john@student.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-tomato-500 focus:ring-1 focus:ring-tomato-500 smooth-transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Password</label>
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
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-tomato-500 focus:ring-1 focus:ring-tomato-500 smooth-transition font-mono"
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

              <button type="submit" disabled={loading} className="w-full tomato-btn py-3 mt-4 text-sm disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? 'Processing...' : 'Verify Email'}
              </button>
            </form>
          )}

          {!success && otpStep === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-4 text-center">
                <p className="text-sm text-blue-800">
                  We've sent a 6-digit OTP to <strong>{formData.email}</strong>.<br />
                  Please enter it below to verify your email.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 text-center">Enter OTP</label>
                <input
                  type="text"
                  maxLength="6"
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                  placeholder="123456"
                  className="w-full text-center text-2xl tracking-[0.5em] py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:border-tomato-500 focus:ring-1 focus:ring-tomato-500 smooth-transition font-mono"
                />
              </div>

              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setOtpStep(1)} 
                  disabled={loading}
                  className="flex-1 py-3 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl smooth-transition disabled:opacity-70"
                >
                  Back
                </button>
                <button 
                  type="submit" 
                  disabled={loading || enteredOtp.length !== 6} 
                  className="flex-1 tomato-btn py-3 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify & Register'}
                </button>
              </div>
            </form>
          )}

          <div className="text-center mt-6">
            <span className="text-xs text-gray-400">Already have a request? </span>
            <Link to={`/login/${role}`} className="text-xs font-semibold text-tomato-500 hover:text-tomato-600 hover:underline smooth-transition">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
