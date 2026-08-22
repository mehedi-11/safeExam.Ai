import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE_URL } from '../api/axiosConfig';
import StudentEvents from './StudentEvents';
import { 
  Calendar, BookOpen, KeyRound, CheckCircle2, ShieldAlert, 
  Hourglass, Play, RefreshCw, GraduationCap,
  Menu, LogOut, Eye, EyeOff, LayoutGrid, List, LayoutDashboard, FileText, Settings, X
} from 'lucide-react';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Exam Password Modal State
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [examPasswordInput, setExamPasswordInput] = useState('');
  const [modalError, setModalError] = useState('');
  const [startingExam, setStartingExam] = useState(false);

  const handleOpenPasswordModal = (examId) => {
    const blockKey = `exam_block_${examId}`;
    const blockedUntil = localStorage.getItem(blockKey);
    if (blockedUntil && new Date().getTime() < parseInt(blockedUntil)) {
      const minsLeft = Math.ceil((parseInt(blockedUntil) - new Date().getTime()) / 60000);
      setError(`You are temporarily blocked from this exam. Try again in ${minsLeft} minutes.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    } else if (blockedUntil) {
      localStorage.removeItem(blockKey);
      localStorage.removeItem(`exam_attempts_${examId}`);
    }
    
    setSelectedExamId(examId);
    setExamPasswordInput('');
    setModalError('');
    setPasswordModalOpen(true);
  };

  const handleStartExamSubmit = async () => {
    setModalError('');
    setStartingExam(true);
    
    const blockKey = `exam_block_${selectedExamId}`;
    const blockedUntil = localStorage.getItem(blockKey);
    if (blockedUntil && new Date().getTime() < parseInt(blockedUntil)) {
      const minsLeft = Math.ceil((parseInt(blockedUntil) - new Date().getTime()) / 60000);
      setModalError(`You are blocked. Try again in ${minsLeft} minutes.`);
      setStartingExam(false);
      return;
    }

    try {
      await api.post(`/student/exams/${selectedExamId}/start`, { exam_password: examPasswordInput });
      
      localStorage.removeItem(`exam_attempts_${selectedExamId}`);
      localStorage.removeItem(blockKey);
      setPasswordModalOpen(false);
      sessionStorage.setItem(`exam_pwd_${selectedExamId}`, examPasswordInput);
      window.open(`/exam/${selectedExamId}`, '_blank');
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) {
        const attemptKey = `exam_attempts_${selectedExamId}`;
        let attempts = parseInt(localStorage.getItem(attemptKey) || '0') + 1;
        
        if (attempts >= 3) {
           const unblockTime = new Date().getTime() + 10 * 60000;
           localStorage.setItem(blockKey, unblockTime.toString());
           setModalError(`Too many wrong attempts. You are blocked for 10 minutes.`);
        } else {
           localStorage.setItem(attemptKey, attempts.toString());
           setModalError(err.response?.data?.message + ` ${3 - attempts} attempts left.`);
        }
      } else {
         setModalError(err.response?.data?.message || 'Error starting exam');
      }
    } finally {
      setStartingExam(false);
    }
  };

  // Data State
  const [exams, setExams] = useState([]);
  const [profile, setProfile] = useState({});

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  // Password Update State
  const [pwData, setPwData] = useState({ oldPassword: '', newPassword: '' });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Centralized API is now used directly
  useEffect(() => {
    if (!token) {
      navigate('/login/student');
      return;
    }
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [exRes, pRes] = await Promise.all([
        api.get('/student/exams'),
        api.get('/student/profile')
      ]);
      setExams(exRes.data);
      setProfile(pRes.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.clear();
        navigate('/login/student');
      } else {
        setError('Failed to load portal data.');
      }
    } finally {
      setLoading(false);
    }
  };

  const triggerSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.put('/student/change-password', pwData);
      triggerSuccess('Password updated successfully');
      setPwData({ oldPassword: '', newPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating password.');
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-150 p-4 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-tomato-500 flex items-center justify-center text-white font-extrabold text-sm">
            <BookOpen size={16} />
          </div>
          <span className="font-extrabold text-md text-black">S-Exam<span className="text-tomato-500">.ai</span></span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-55 transition-colors"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div className={`fixed inset-y-0 left-0 bg-white border-r border-gray-150 w-64 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static flex flex-col justify-between shrink-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo and Menu Links */}
        <div>
          {/* Brand Logo Header */}
          <div className="p-6 border-b border-gray-150 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-tomato-500 flex items-center justify-center text-white shadow-lg shadow-tomato-500/20">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight text-black">
                  S-Exam<span className="text-tomato-500">.ai</span>
                </span>
                <span className="text-[10px] text-gray-400 block font-semibold tracking-widest uppercase">Student Portal</span>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1.5 text-gray-400 hover:text-dark-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="p-4 space-y-1.5">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'exams', label: 'My Exams', icon: FileText },
              { id: 'events', label: 'Events', icon: Calendar },
              { id: 'results', label: 'My Results', icon: CheckCircle2 },
              { id: 'profile', label: 'Student Profile', icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setError('');
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 font-semibold text-sm rounded-xl transition-all ${
                  activeTab === tab.id 
                    ? 'bg-tomato-500 text-white shadow-lg shadow-tomato-500/20 animate-fade-in'
                    : 'text-gray-500 hover:text-dark-900 hover:bg-gray-100/60'
                }`}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-150 space-y-4">
          <div className="flex items-center gap-3 px-2">
            {profile.profile_image ? (
              <img 
                src={`${API_BASE_URL}${profile.profile_image}`} 
                alt="Student" 
                className="w-10 h-10 rounded-full object-cover border border-tomato-500 shadow-sm"
                onError={(e) => { e.target.src = 'https://api.dicebear.com/7.x/initials/svg?seed=' + profile.name; }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-tomato-100 text-tomato-500 flex items-center justify-center border border-tomato-200 font-extrabold">
                {profile.name ? profile.name.charAt(0).toUpperCase() : 'S'}
              </div>
            )}
            <div className="min-w-0">
              <span className="font-bold text-xs text-dark-900 block truncate">{profile.name || 'Student'}</span>
              <span className="text-[10px] text-gray-400 font-semibold block truncate">ID: {profile.id}</span>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.clear();
              navigate('/');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 hover:border-tomato-500 hover:bg-tomato-50/10 hover:text-tomato-600 rounded-xl text-xs font-bold text-gray-650 transition-all active:scale-95"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-grow flex-1 min-w-0 p-6 md:p-10 max-h-screen overflow-y-auto">
        
        {/* Header Summary */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-dark-900">Student Portal</h1>
            <p className="text-gray-400 text-sm">Welcome back, {profile.name}! Track exams and course enrollment statuses.</p>
          </div>
          
        </div>

        {/* Status Alerts */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 py-3 px-5 rounded-xl text-xs font-semibold mb-6 flex items-center gap-2 animate-fade-in shadow-sm">
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 py-3 px-5 rounded-xl text-xs font-semibold mb-6 flex items-center gap-2 animate-fade-in shadow-sm">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Dynamic Panel */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 md:p-8 shadow-sm">
          
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (() => {
            const liveExamsCount = exams.filter(e => e.is_live && e.exam_status !== 'completed').length;
            const completedExams = exams.filter(e => e.exam_status === 'completed' && e.score !== null && !isNaN(e.score) && e.results_published);
            const completedCount = completedExams.length;
            const avgPercentage = completedCount > 0 
              ? (completedExams.reduce((sum, e) => {
                  const maxMarks = e.total_marks || 100; // fallback to 100 if undefined
                  return sum + ((Number(e.score) / maxMarks) * 100);
                }, 0) / completedCount).toFixed(1)
              : 0;
            
            let suggestionTitle = "Keep going!";
            let suggestionText = "Take some exams to start seeing your performance insights and suggestions here.";
            let suggestionColor = "text-blue-700";
            let suggestionBg = "bg-blue-50 border-blue-200";

            if (completedCount > 0) {
              if (avgPercentage >= 80) {
                suggestionTitle = "Excellent Performance!";
                suggestionText = "You have an outstanding average score. Keep up the great work and consider taking advanced courses to challenge yourself further.";
                suggestionColor = "text-green-700";
                suggestionBg = "bg-green-50 border-green-200";
              } else if (avgPercentage >= 50) {
                suggestionTitle = "Good, but can improve!";
                suggestionText = "You are doing well, but there's room for improvement. Focus on your weaker topics and review past mistakes to boost your score.";
                suggestionColor = "text-yellow-700";
                suggestionBg = "bg-yellow-50 border-yellow-200";
              } else {
                suggestionTitle = "Needs Attention!";
                suggestionText = "Your average score is quite low. We strongly suggest revising core concepts before attempting more exams. Don't hesitate to ask your instructors for help.";
                suggestionColor = "text-red-700";
                suggestionBg = "bg-red-50 border-red-200";
              }
            }

            return (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-xl font-bold text-dark-900 mb-6">Dashboard Overview</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-tomato-100 text-tomato-500 rounded-xl flex items-center justify-center shrink-0">
                      <Play size={24} />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Live Exams</p>
                      <h4 className="text-2xl font-black text-dark-900">{liveExamsCount}</h4>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 text-green-500 rounded-xl flex items-center justify-center shrink-0">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Completed Exams</p>
                      <h4 className="text-2xl font-black text-dark-900">{completedCount}</h4>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                      <GraduationCap size={24} />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Average %</p>
                      <h4 className="text-2xl font-black text-dark-900">{avgPercentage}%</h4>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-2xl border ${suggestionBg} flex items-start gap-4 mt-8 shadow-sm`}>
                  <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-white border ${suggestionBg} shadow-sm`}>
                    <ShieldAlert size={20} className={suggestionColor} />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${suggestionColor} mb-1 uppercase tracking-wider`}>Insight & Suggestion</h4>
                    <h5 className={`font-black ${suggestionColor} mb-2`}>{suggestionTitle}</h5>
                    <p className={`text-sm ${suggestionColor} opacity-90 leading-relaxed font-medium`}>{suggestionText}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                  {/* Recent Results */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-bold text-dark-900">Recent Results</h4>
                      <button onClick={() => setActiveTab('results')} className="text-tomato-500 text-xs font-bold hover:underline">View All</button>
                    </div>
                    {completedExams.length === 0 ? (
                      <div className="bg-gray-50 border border-gray-150 rounded-xl p-5 text-center text-xs text-gray-500">
                        No recent results.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {completedExams.sort((a, b) => new Date(b.finished_at) - new Date(a.finished_at)).slice(0, 3).map(exam => (
                          <div key={exam.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                            <div className="min-w-0 pr-4">
                              <h5 className="font-bold text-dark-900 text-sm truncate">{exam.title}</h5>
                              <p className="text-[11px] text-gray-500 mt-0.5">{new Date(exam.finished_at).toLocaleDateString()}</p>
                            </div>
                            <div className="shrink-0 bg-green-50 text-green-700 font-black text-sm px-3 py-1.5 rounded-lg border border-green-200">
                              {exam.score}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Upcoming Schedule */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-bold text-dark-900">Upcoming Schedule</h4>
                      <button onClick={() => setActiveTab('exams')} className="text-tomato-500 text-xs font-bold hover:underline">View All</button>
                    </div>
                    {(() => {
                      const upcoming = exams.filter(e => !e.is_live && e.exam_status !== 'completed' && new Date(e.exam_date) > new Date())
                                            .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))
                                            .slice(0, 3);
                      if (upcoming.length === 0) {
                        return (
                          <div className="bg-gray-50 border border-gray-150 rounded-xl p-5 text-center text-xs text-gray-500">
                            No upcoming exams scheduled.
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-3">
                          {upcoming.map(exam => (
                            <div key={exam.id} className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 items-center shadow-sm">
                              <div className="bg-blue-50 border border-blue-100 w-12 h-12 rounded-lg flex flex-col items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-blue-500 uppercase">{new Date(exam.exam_date).toLocaleString('default', { month: 'short' })}</span>
                                <span className="text-lg font-black text-blue-700 leading-none">{new Date(exam.exam_date).getDate()}</span>
                              </div>
                              <div className="min-w-0">
                                <h5 className="font-bold text-dark-900 text-sm truncate">{exam.title}</h5>
                                <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 font-medium">
                                  <span className="flex items-center gap-1"><Clock size={12}/> {new Date(exam.exam_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                  <span className="flex items-center gap-1"><Hourglass size={12}/> {exam.duration_minutes} Mins</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>

              </div>
            );
          })()}

          {/* TAB: EVENTS */}
          {activeTab === 'events' && (
            <div className="animate-fade-in">
              <StudentEvents />
            </div>
          )}

          {/* TAB: EXAMS */}
          {activeTab === 'exams' && (() => {
            const now = new Date();
            const filteredExams = exams.filter(exam => {
              const q = searchQuery.toLowerCase();
              const matchesSearch = (
                (exam.university_name || '').toLowerCase().includes(q) ||
                (exam.course_name || '').toLowerCase().includes(q) ||
                (exam.course_code || '').toLowerCase().includes(q) ||
                (exam.title || '').toLowerCase().includes(q)
              );
              
              const matchesFilter = exam.is_live;
              
              return matchesSearch && matchesFilter;
            });

            return (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div className="flex items-center gap-6">
                  <h3 className="text-lg font-bold text-dark-900">Available Exam Sittings</h3>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <span className="px-4 py-1.5 text-xs font-bold bg-white text-dark-900 shadow-sm rounded-md flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                      Live Exams Only
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full xl:w-auto">
                  <input
                    type="text"
                    name="search_dummy"
                    autoComplete="off"
                    data-lpignore="true"
                    placeholder="Search by university, course name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-80 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500 smooth-transition"
                  />
                  <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-tomato-500' : 'text-gray-400 hover:text-gray-700'}`}
                      title="Grid View"
                    >
                      <LayoutGrid size={18} />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-tomato-500' : 'text-gray-400 hover:text-gray-700'}`}
                      title="List View"
                    >
                      <List size={18} />
                    </button>
                  </div>
                </div>
              </div>
              
              {filteredExams.length === 0 ? (
                <div className="border border-dashed border-gray-200 bg-gray-50/20 py-12 text-center text-xs text-gray-400 rounded-xl">
                  {searchQuery ? 'No exams match your search.' : 'There are no exams available at the moment.'}
                </div>
              ) : viewMode === 'list' ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                  <table className="w-full text-left text-sm text-gray-500">
                    <thead className="bg-gray-50 text-xs text-gray-700 uppercase border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 font-bold">Exam Title</th>
                        <th className="px-6 py-4 font-bold">Course Details</th>
                        <th className="px-6 py-4 font-bold">Schedule</th>
                        <th className="px-6 py-4 font-bold">Status</th>
                        <th className="px-6 py-4 text-center font-bold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {filteredExams.map(exam => {
                        const isFinished = exam.exam_status === 'completed' && (exam.attempts || 1) >= (exam.max_attempts || 1);
                        const isBlocked = exam.block_until && new Date(exam.block_until) > new Date();
                        
                        return (
                          <tr key={exam.unique_id || exam.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <h4 className="font-bold text-dark-900">{exam.title}</h4>
                            </td>
                            <td className="px-6 py-4">
                              {exam.university_name && <p className="text-xs text-tomato-600 font-semibold">{exam.university_name}</p>}
                              {(exam.course_name || exam.course_code) && (
                                <p className="text-[11px] text-gray-600 font-medium">
                                  {exam.course_name} {exam.course_code && `(${exam.course_code})`}
                                </p>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1 text-xs text-gray-500">
                                <p className="flex items-center gap-1.5"><Calendar size={13} /> {new Date(exam.exam_date).toLocaleString()}</p>
                                <p className="flex items-center gap-1.5"><Hourglass size={13} /> {exam.duration_minutes} Mins</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {exam.exam_status === 'completed' ? (
                                <span className="bg-green-50 text-green-700 border border-green-250 px-2.5 py-0.5 rounded text-[10px] font-bold">Score: {exam.score}</span>
                              ) : isBlocked ? (
                                <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold flex items-center w-fit gap-1 animate-pulse">
                                  <ShieldAlert size={12} /> Locked
                                </span>
                              ) : (
                                <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded text-[10px] font-bold">Scheduled</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {isFinished ? (
                                <span className="text-xs font-semibold text-green-700">Completed</span>
                              ) : (
                                <button
                                  onClick={() => handleOpenPasswordModal(exam.id)}
                                  className="tomato-btn w-full py-1.5 px-3 text-xs flex items-center justify-center gap-1"
                                >
                                  <Play size={12} fill="white" />
                                  <span>{exam.exam_status === 'started' ? 'Resume' : exam.exam_status === 'completed' ? 'Retake' : 'Enter'}</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredExams.map(exam => {
                    const isUpcoming = new Date(exam.exam_date) > new Date();
                    const isFinished = exam.exam_status === 'completed' && (exam.attempts || 1) >= (exam.max_attempts || 1);
                    const isBlocked = exam.block_until && new Date(exam.block_until) > new Date();

                    return (
                      <div key={exam.unique_id || exam.id} className="border border-gray-150 p-5 rounded-2xl flex flex-col justify-between bg-white relative hover:shadow-md smooth-transition">
                        <div>
                          <div className="flex justify-end items-start mb-3">
                            {exam.exam_status === 'completed' ? (
                              <span className="bg-green-50 text-green-700 border border-green-250 px-2.5 py-0.5 rounded text-[10px] font-bold">
                                Score: {exam.score}
                              </span>
                            ) : isBlocked ? (
                              <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 animate-pulse">
                                <ShieldAlert size={12} />
                                <span>Locked</span>
                              </span>
                            ) : (
                              <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                Scheduled
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-dark-900 text-sm mb-2">{exam.title}</h4>

                          <div className="mb-4">
                             {exam.university_name && <p className="text-xs text-tomato-600 font-semibold truncate" title={exam.university_name}>{exam.university_name}</p>}
                             {(exam.course_name || exam.course_code) && (
                               <p className="text-[11px] text-gray-600 font-medium truncate" title={`${exam.course_name || ''} ${exam.course_code || ''}`}>
                                 {exam.course_name} {exam.course_code && `(${exam.course_code})`}
                               </p>
                             )}
                          </div>

                          <div className="space-y-1.5 text-[11px] text-gray-500 border-t border-gray-100 pt-3">
                            <p className="flex items-center gap-1.5"><Calendar size={13} /> {new Date(exam.exam_date).toLocaleString()}</p>
                            <p className="flex items-center gap-1.5"><Hourglass size={13} /> {exam.duration_minutes} Mins Limit</p>
                          </div>
                        </div>

                        <div className="mt-5 pt-2">
                          {isFinished ? (
                            <div className="bg-green-50/35 border border-green-100 rounded-xl p-3 text-center text-xs font-semibold text-green-800">
                              Exam Completed Successfully
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenPasswordModal(exam.id)}
                              className="tomato-btn w-full py-2.5 text-xs flex items-center justify-center gap-1"
                            >
                              <Play size={12} fill="white" />
                              <span>{exam.exam_status === 'started' ? 'Resume Exam' : exam.exam_status === 'completed' ? 'Retake Exam' : 'Enter Exam'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            );
          })()}



          {/* TAB: RESULTS */}
          {activeTab === 'results' && (() => {
            const completedExams = exams.filter(exam => exam.exam_status === 'completed');

            return (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-6">
                  <h3 className="text-lg font-bold text-dark-900">My Exam Results</h3>
                </div>

                {completedExams.length === 0 ? (
                  <div className="border border-dashed border-gray-200 bg-gray-50/20 py-12 text-center text-xs text-gray-400 rounded-xl">
                    You haven't completed any exams yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                    <table className="w-full text-left text-sm text-gray-500">
                      <thead className="bg-gray-50 text-xs text-gray-700 uppercase border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 font-bold">Exam Title</th>
                          <th className="px-6 py-4 font-bold">Course Details</th>
                          <th className="px-6 py-4 font-bold">Completed On</th>
                          <th className="px-6 py-4 font-bold text-center">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150">
                        {completedExams.map(exam => {
                          const isPublished = exam.results_published;

                          return (
                            <tr key={exam.unique_id || exam.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <h4 className="font-bold text-dark-900">{exam.title}</h4>
                              </td>
                              <td className="px-6 py-4">
                                {exam.university_name && <p className="text-xs text-tomato-600 font-semibold">{exam.university_name}</p>}
                                {(exam.course_name || exam.course_code) && (
                                  <p className="text-[11px] text-gray-600 font-medium">
                                    {exam.course_name} {exam.course_code && `(${exam.course_code})`}
                                  </p>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1 text-xs text-gray-500">
                                  <p className="flex items-center gap-1.5"><Calendar size={13} /> {new Date(exam.finished_at).toLocaleString()}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {isPublished ? (
                                  <span className="bg-green-50 text-green-700 border border-green-250 px-3 py-1 rounded-lg text-xs font-bold shadow-sm">
                                    {exam.score}
                                  </span>
                                ) : (
                                  <span className="bg-orange-50 text-orange-600 border border-orange-200 px-2 py-1 rounded text-[10px] font-bold">
                                    Pending Publish
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB: PROFILE & PASSWORD */}
          {activeTab === 'profile' && (
            <div className="max-w-md animate-fade-in space-y-6">
              <h3 className="text-lg font-bold text-dark-900">Student Profile Credentials</h3>
              
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-150 space-y-3 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Student ID</span>
                  <span className="font-mono font-bold text-dark-900 text-sm">{profile.id}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Full Name</span>
                  <span className="font-bold text-dark-900">{profile.name}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Email Address</span>
                  <span className="font-semibold text-gray-600">{profile.email}</span>
                </div>
              </div>

              <div className="border-t border-gray-150 pt-6">
                <h4 className="font-bold text-sm text-dark-900 mb-4 flex items-center gap-1.5">
                  <KeyRound size={16} className="text-tomato-500" />
                  <span>Update Password</span>
                </h4>
                
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Current Password <span className="text-red-500 ml-1">*</span></label>
                    <div className="relative">
                      <input 
                        type={showOldPassword ? "text" : "password"} required placeholder="••••••••"
                        value={pwData.oldPassword}
                        onChange={e => setPwData({ ...pwData, oldPassword: e.target.value })}
                        className="w-full px-3 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500 smooth-transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-tomato-500 smooth-transition"
                      >
                        {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">New Password <span className="text-red-500 ml-1">*</span></label>
                    <div className="relative">
                      <input 
                        type={showNewPassword ? "text" : "password"} required placeholder="••••••••"
                        value={pwData.newPassword}
                        onChange={e => setPwData({ ...pwData, newPassword: e.target.value })}
                        className="w-full px-3 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500 smooth-transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-tomato-500 smooth-transition"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="tomato-btn w-full py-2.5 mt-2">
                    Submit Password Change
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
        
        {/* Footer */}
        <div className="mt-auto text-center text-gray-400 text-xs py-4 border-t border-gray-200">
          Developed by MD Mehedi Hasan (232004048) and MST Onamika Jannat Ara (232005048) for the final Project
        </div>
      </div>

      {/* Password Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPasswordModalOpen(false)} />
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl z-10 overflow-hidden animate-fade-in flex flex-col">
            <div className="p-5 border-b border-gray-150 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-dark-900">Exam Verification</h3>
              <button onClick={() => setPasswordModalOpen(false)} className="text-gray-400 hover:text-tomato-500 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6">
              {modalError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl font-medium">
                  {modalError}
                </div>
              )}
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Enter Exam Password</label>
              <input 
                type="password" 
                name="exam_password_dummy"
                autoComplete="new-password"
                value={examPasswordInput}
                onChange={e => setExamPasswordInput(e.target.value)}
                placeholder="Required for live exams"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500 smooth-transition"
                autoFocus
              />
              <p className="text-[10px] text-gray-400 mt-2 text-center">Contact your instructor if you don't have the password.</p>
              
              <button 
                onClick={handleStartExamSubmit}
                disabled={startingExam}
                className="tomato-btn w-full py-2.5 mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {startingExam ? <RefreshCw className="animate-spin" size={16} /> : null}
                {startingExam ? 'Verifying...' : 'Proceed to Exam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
