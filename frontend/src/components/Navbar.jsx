import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Shield, GraduationCap, User, X, Mail, Phone, MapPin, Send } from 'lucide-react';
import { API_BASE_URL } from '../api/axiosConfig';

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const [showContact, setShowContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    // Simulate sending message
    setContactSuccess(true);
    setTimeout(() => {
      setContactSuccess(false);
      setShowContact(false);
    }, 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const getRoleIcon = () => {
    if (user.role === 'admin') return <Shield size={18} className="text-tomato-500" />;
    if (user.role === 'teacher') return <GraduationCap size={18} className="text-tomato-500" />;
    return <User size={18} className="text-tomato-500" />;
  };

  return (
    <nav className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-40 px-6 py-4 flex justify-between items-center relative">
      <div className="w-[250px]">
        <Link to="/" className="flex items-center gap-2 group w-fit">
          <span className="w-9 h-9 rounded-xl bg-tomato-500 flex items-center justify-center text-white font-bold text-lg group-hover:scale-105 smooth-transition shadow-md shadow-tomato-200">
            S
          </span>
          <span className="font-bold text-xl tracking-tight text-dark-900">
            S-Exam<span className="text-tomato-500">.ai</span>
          </span>
        </Link>
      </div>

      {token && user.role ? (
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-150 py-1.5 px-3 rounded-xl">
            {user.profile_image ? (
              <img 
                src={`${API_BASE_URL}${user.profile_image}`} 
                alt="Profile" 
                className="w-7 h-7 rounded-full object-cover border border-tomato-200"
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'; }}
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-tomato-100 flex items-center justify-center text-tomato-600">
                {getRoleIcon()}
              </div>
            )}
            <div className="text-left">
              <p className="text-xs font-semibold text-dark-900 leading-3">{user.name}</p>
              <span className="text-[10px] text-gray-500 capitalize">{user.role} {user.role === 'student' && `(${user.id})`}</span>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-500 hover:text-tomato-600 font-medium py-1.5 px-3 rounded-lg hover:bg-tomato-50 smooth-transition text-sm"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      ) : (
        <>
          <div className="w-[250px] flex justify-end ml-auto">
            <button 
              onClick={() => setShowContact(true)}
              className="tomato-btn py-2 px-5 text-sm"
            >
              Contact Us
            </button>
          </div>
        </>
      )}

      {/* Contact Modal */}
      {showContact && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-tomato-500 p-6 flex justify-between items-center text-white">
              <h2 className="text-2xl font-bold">Contact Us</h2>
              <button onClick={() => setShowContact(false)} className="hover:bg-white/20 p-2 rounded-full smooth-transition">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto">
              {contactSuccess ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-dark-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-500">Thank you for reaching out. We will get back to you shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Full Name <span className="text-red-500 ml-1">*</span></label>
                    <input type="text" required placeholder="John Doe" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-tomato-500 focus:ring-1 focus:ring-tomato-500 smooth-transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Email Address <span className="text-red-500 ml-1">*</span></label>
                    <input type="email" required placeholder="john@example.com" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-tomato-500 focus:ring-1 focus:ring-tomato-500 smooth-transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Message <span className="text-red-500 ml-1">*</span></label>
                    <textarea required rows="4" placeholder="How can we help you?" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-tomato-500 focus:ring-1 focus:ring-tomato-500 smooth-transition resize-none"></textarea>
                  </div>
                  
                  <div className="flex gap-4 items-center pt-4 border-t border-gray-100">
                    <div className="flex-1 flex flex-col gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1.5"><Mail size={14}/> support@S-Exam.ai</span>
                      <span className="flex items-center gap-1.5"><Phone size={14}/> +1 800 123 4567</span>
                    </div>
                    <button type="submit" className="tomato-btn py-2.5 px-6">
                      Send Message
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </nav>
  );
}
