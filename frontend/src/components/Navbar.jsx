import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, Shield, GraduationCap, User, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../api/axiosConfig';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const getRoleIcon = () => {
    if (user.role === 'admin') return <Shield size={18} className="text-tomato-400" />;
    if (user.role === 'teacher') return <GraduationCap size={18} className="text-tomato-400" />;
    return <User size={18} className="text-tomato-400" />;
  };

  const isInsightsActive = location.pathname.includes('/student') && location.search.includes('tab=insights');

  return (
    <nav className="sticky top-0 bg-white border-b border-gray-100 z-40 px-6 py-4 flex justify-between items-center relative">
      <div className="w-[250px]">
        <Link to="/" className="flex items-center gap-2 group w-fit">
          <span className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-lg group-hover:scale-105 smooth-transition shadow-md shadow-tomato-200">
            S
          </span>
          <span className="font-bold text-xl tracking-tight text-gray-900">
            SExam<span className="text-tomato-400">.AI</span>
          </span>
        </Link>
      </div>

      {token && user.role ? (
        <div className="flex items-center gap-3 sm:gap-5">
          {user.role === 'student' && (
            <Link
              to="/dashboard/student?tab=insights"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm group ${
                isInsightsActive
                  ? 'bg-gray-900 text-white shadow-tomato-500/10'
                  : 'bg-white border border-gray-200 text-gray-700 hover:text-gray-900 hover:border-gray-900 hover:bg-gray-50'
              }`}
              title="Subject Insights & Suggestions"
            >
              <Sparkles 
                size={15} 
                className={`transition-transform group-hover:scale-110 ${
                  isInsightsActive ? 'text-tomato-400' : 'text-tomato-500'
                }`} 
              />
              <span className="hidden sm:inline">Subject Insights & Suggestions</span>
              <span className="sm:hidden inline">Insights</span>
            </Link>
          )}

          <div className="flex items-center gap-3 bg-white border border-gray-200 py-1.5 px-3 rounded-xl">
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
              <p className="text-xs font-semibold text-gray-900 leading-3">{user.name}</p>
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
        <div className="w-[250px]" />
      )}
    </nav>
  );
}

