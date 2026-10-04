import React, { useState, useEffect } from 'react';
import WelcomeHeader from "../components/WelcomeHeader";
import { useNavigate } from 'react-router-dom';
import api, { API_BASE_URL } from '../api/axiosConfig';
import StudentEvents from './StudentEvents';
import { 
  Calendar, BookOpen, KeyRound, CheckCircle2, ShieldAlert, 
  Hourglass, Play, RefreshCw, GraduationCap, Clock,
  Menu, LogOut, Eye, EyeOff, LayoutGrid, List, LayoutDashboard, FileText, Settings, X, Edit, User, Search
} from 'lucide-react';
import Loader from '../components/Loader';

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

  // Profile State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileDob, setProfileDob] = useState("");
  const [profileUniversity, setProfileUniversity] = useState("");
  const [profileAddress, setProfileAddress] = useState("");


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
      setProfileName(pRes.data.name || "");
      setProfileEmail(pRes.data.email || "");
      setProfileDob(pRes.data.dob ? new Date(pRes.data.dob).toISOString().slice(0, 10) : "");
      setProfileUniversity(pRes.data.university || "");
      setProfileAddress(pRes.data.address || "");
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

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const formData = new FormData();
    formData.append("name", profileName);
    formData.append("email", profileEmail);
    formData.append("dob", profileDob);
    formData.append("university", profileUniversity);
    formData.append("address", profileAddress);
    if (profileImageFile) {
      formData.append("profile_image", profileImageFile);
    }

    try {
      const res = await api.put("/student/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      triggerSuccess("Profile updated successfully");
      setProfile(res.data.user);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setIsProfileModalOpen(false);
    } catch (err) {
      setError("Error updating profile details.");
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
    <div className="min-h-screen bg-dark-850 flex flex-col lg:flex-row">
      {loading && <Loader />}

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between bg-dark-850 border-b border-dark-700 p-4 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-lime-500 flex items-center justify-center text-dark-900 font-extrabold text-sm">
            <BookOpen size={16} />
          </div>
          <span className="font-extrabold text-md text-gray-100">SExam<span className="text-lime-400">.AI</span></span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 border border-dark-700 rounded-lg text-gray-400 hover:bg-dark-800 transition-colors"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div className={`fixed inset-y-0 left-0 bg-dark-850 border-r border-dark-700 w-64 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static flex flex-col justify-between shrink-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo and Menu Links */}
        <div>
          {/* Brand Logo Header */}
          <div className="p-6 border-b border-dark-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-lime-500 flex items-center justify-center text-dark-900 shadow-lg shadow-lime-500/20">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight text-gray-100">
                  SExam<span className="text-lime-400">.AI</span>
                </span>
                <span className="text-[10px] text-gray-400 block font-semibold tracking-widest uppercase">Student Portal</span>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1.5 text-gray-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
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
                    ? 'bg-lime-500 text-white shadow-lg shadow-lime-500/20 animate-fade-in'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-dark-700'
                }`}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-dark-700 space-y-4">
          <div className="flex items-center gap-3 px-2">
            {profile.profile_image ? (
              <img 
                src={`${API_BASE_URL}${profile.profile_image}`} 
                alt="Student" 
                className="w-10 h-10 rounded-full object-cover border border-lime-500 shadow-sm"
                onError={(e) => { e.target.src = 'https://api.dicebear.com/7.x/initials/svg?seed=' + profile.name; }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-lime-100 text-lime-400 flex items-center justify-center border border-lime-200 font-extrabold">
                {profile.name ? profile.name.charAt(0).toUpperCase() : 'S'}
              </div>
            )}
            <div className="min-w-0">
              <span className="font-bold text-xs text-gray-100 block truncate">{profile.name || 'Student'}</span>
              <span className="text-[10px] text-gray-400 font-semibold block truncate">ID: {profile.id}</span>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.clear();
              navigate('/');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dark-700 hover:border-lime-500 hover:bg-lime-50/10 hover:text-lime-400 rounded-xl text-xs font-bold text-gray-400 transition-all active:scale-95"
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
      <div className="flex-grow flex-1 min-w-0 p-3 pb-16 md:p-4 md:pb-4 max-h-screen overflow-y-auto">
        {activeTab === "dashboard" && <WelcomeHeader userName={user?.name || user?.username} />}
        {/* Header Summary Removed */}

        {/* Status Alerts */}
        {success && (
          <div className="bg-lime-50 border border-lime-200 text-lime-700 py-3 px-5 rounded-xl text-xs font-semibold mb-6 flex items-center gap-2 animate-fade-in shadow-sm">
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
        <div className="bg-dark-850 rounded-2xl border border-dark-700 p-6 md:p-8 shadow-sm">
          
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
            let suggestionColor = "text-lime-700";
            let suggestionBg = "bg-lime-50 border-lime-200";

            // Subject-wise grouping
            const subjectStats = {};
            completedExams.forEach(e => {
              const subject = e.course_name || e.course_code || 'General';
              if (!subjectStats[subject]) {
                subjectStats[subject] = { totalPercentage: 0, count: 0 };
              }
              const maxMarks = e.total_marks || 100;
              const percentage = (Number(e.score) / maxMarks) * 100;
              subjectStats[subject].totalPercentage += percentage;
              subjectStats[subject].count += 1;
            });

            const subjectAverages = Object.entries(subjectStats).map(([subject, stats]) => ({
              subject,
              average: (stats.totalPercentage / stats.count).toFixed(1)
            })).sort((a, b) => b.average - a.average);

            let strongSubjects = [];
            let weakSubjects = [];
            
            subjectAverages.forEach(s => {
              if (s.average >= 75) strongSubjects.push(s.subject);
              else if (s.average < 50) weakSubjects.push(s.subject);
            });

            if (completedCount > 0) {
              if (avgPercentage >= 80) {
                suggestionTitle = "Excellent Overall Performance!";
                suggestionColor = "text-lime-700";
                suggestionBg = "bg-lime-50 border-lime-200";
              } else if (avgPercentage >= 50) {
                suggestionTitle = "Good, but can improve!";
                suggestionColor = "text-lime-700";
                suggestionBg = "bg-lime-50 border-lime-200";
              } else {
                suggestionTitle = "Needs Attention!";
                suggestionColor = "text-red-700";
                suggestionBg = "bg-red-50 border-red-200";
              }
            }

            return (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-xl font-bold text-gray-100 mb-6">Dashboard Overview</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-dark-850 p-6 rounded-2xl border border-dark-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-lime-100 text-lime-400 rounded-full flex items-center justify-center shrink-0">
                      <Play size={24} />
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Live Exams</p>
                      <h4 className="text-2xl font-black text-gray-100">{liveExamsCount}</h4>
                    </div>
                  </div>
                  
                  <div className="bg-dark-850 p-6 rounded-2xl border border-dark-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-lime-100 text-lime-400 rounded-full flex items-center justify-center shrink-0">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Completed Exams</p>
                      <h4 className="text-2xl font-black text-gray-100">{completedCount}</h4>
                    </div>
                  </div>
                  
                  <div className="bg-dark-850 p-6 rounded-2xl border border-dark-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-lime-100 text-lime-400 rounded-full flex items-center justify-center shrink-0">
                      <GraduationCap size={24} />
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Overall Average</p>
                      <h4 className="text-2xl font-black text-gray-100">{avgPercentage}%</h4>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-2xl border ${suggestionBg} mt-8 shadow-sm transition-colors duration-300`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-dark-850 border ${suggestionBg} shadow-sm`}>
                      <ShieldAlert size={20} className={suggestionColor} />
                    </div>
                    <div>
                      <h4 className={`text-sm font-bold ${suggestionColor} uppercase tracking-wider`}>Subject Insights & Suggestions</h4>
                      <h5 className={`font-black ${suggestionColor}`}>{suggestionTitle}</h5>
                    </div>
                  </div>
                  
                  {subjectAverages.length > 0 ? (
                    <div className="space-y-4">
                      <div className="text-sm opacity-90 leading-relaxed font-medium space-y-2">
                        {strongSubjects.length > 0 && (
                          <div className="p-3 bg-lime-100/50 rounded-xl border border-lime-200 text-lime-800">
                            <strong className="font-extrabold block mb-1">🚀 Doing Great In:</strong> 
                            {strongSubjects.join(', ')} 
                            <p className="text-xs mt-1 font-normal opacity-80">Keep up the great work in these subjects! You have a solid grasp of the material.</p>
                          </div>
                        )}
                        {weakSubjects.length > 0 && (
                          <div className="p-3 bg-red-100/50 rounded-xl border border-red-200 text-red-800">
                            <strong className="font-extrabold block mb-1">⚠️ Needs Improvement In:</strong> 
                            {weakSubjects.join(', ')}
                            <p className="text-xs mt-1 font-normal opacity-80">Try to review core concepts, practice more, and ask your teachers for help in these areas.</p>
                          </div>
                        )}
                        {weakSubjects.length === 0 && strongSubjects.length === 0 && (
                          <div className="p-3 bg-lime-100/50 rounded-xl border border-lime-200 text-lime-800">
                            <strong className="font-extrabold block mb-1">📈 Steady Progress:</strong> 
                            Your performance is average across subjects. Push a little harder to reach top scores!
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-dark-700">
                        {subjectAverages.map(s => (
                          <span key={s.subject} className="px-3 py-1.5 bg-dark-850 rounded-lg text-xs font-bold border border-dark-700 text-gray-300 shadow-sm flex items-center gap-1.5 hover:border-lime-500 transition-colors">
                            <span className="truncate max-w-[120px]" title={s.subject}>{s.subject}</span>
                            <span className={`px-1.5 py-0.5 rounded-md ${s.average >= 75 ? 'bg-lime-100 text-lime-700' : s.average < 50 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {s.average}%
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className={`text-sm ${suggestionColor} opacity-90 leading-relaxed font-medium`}>{suggestionText}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                  {/* Recent Results */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-bold text-gray-100">Recent Results</h4>
                      <button onClick={() => setActiveTab('results')} className="text-lime-400 text-xs font-bold hover:underline">View All</button>
                    </div>
                    {completedExams.length === 0 ? (
                      <div className="bg-dark-900 border border-dark-700 rounded-xl p-5 text-center text-xs text-gray-400">
                        No recent results.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {completedExams.sort((a, b) => new Date(b.finished_at) - new Date(a.finished_at)).slice(0, 3).map(exam => (
                          <div key={exam.id} className="bg-dark-850 border border-dark-700 rounded-xl p-4 flex items-center justify-between shadow-sm">
                            <div className="min-w-0 pr-4">
                              <h5 className="font-bold text-gray-100 text-sm truncate">{exam.title}</h5>
                              <p className="text-[11px] text-gray-400 mt-0.5">{new Date(exam.finished_at).toLocaleDateString()}</p>
                            </div>
                            <div className="shrink-0 bg-lime-50 text-lime-700 font-black text-sm px-3 py-1.5 rounded-lg border border-lime-200">
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
                      <h4 className="text-lg font-bold text-gray-100">Upcoming Schedule</h4>
                      <button onClick={() => setActiveTab('exams')} className="text-lime-400 text-xs font-bold hover:underline">View All</button>
                    </div>
                    {(() => {
                      const upcoming = exams.filter(e => !e.is_live && e.exam_status !== 'completed' && new Date(e.exam_date) > new Date())
                                            .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))
                                            .slice(0, 3);
                      if (upcoming.length === 0) {
                        return (
                          <div className="bg-dark-900 border border-dark-700 rounded-xl p-5 text-center text-xs text-gray-400">
                            No upcoming exams scheduled.
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-3">
                          {upcoming.map(exam => (
                            <div key={exam.id} className="bg-dark-850 border border-dark-700 rounded-xl p-4 flex gap-4 items-center shadow-sm">
                              <div className="bg-lime-50 border border-lime-100 w-12 h-12 rounded-full flex flex-col items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-lime-400 uppercase">{new Date(exam.exam_date).toLocaleString('default', { month: 'short' })}</span>
                                <span className="text-lg font-black text-lime-700 leading-none">{new Date(exam.exam_date).getDate()}</span>
                              </div>
                              <div className="min-w-0">
                                <h5 className="font-bold text-gray-100 text-sm truncate">{exam.title}</h5>
                                <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400 font-medium">
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
                  <h3 className="text-lg font-bold text-gray-100">Available Exam Sittings</h3>
                  <div className="flex bg-dark-800 p-1 rounded-lg">
                    <span className="px-4 py-1.5 text-xs font-bold bg-dark-850 text-gray-100 shadow-sm rounded-md flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-lime-500 rounded-full animate-pulse"></span>
                      Live Exams Only
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full xl:w-auto">
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                      type="text"
                      name="search_dummy"
                      autoComplete="off"
                      data-lpignore="true"
                      placeholder="Search by university, course name or code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-dark-900 hover:bg-dark-850 border border-dark-700 rounded-lg text-sm focus:outline-none focus:border-lime-500 transition-colors"
                    />
                  </div>
                  <div className="flex items-center bg-dark-800 p-1 rounded-xl">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-dark-850 shadow-sm text-lime-400' : 'text-gray-400 hover:text-gray-300'}`}
                      title="Grid View"
                    >
                      <LayoutGrid size={18} />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-dark-850 shadow-sm text-lime-400' : 'text-gray-400 hover:text-gray-300'}`}
                      title="List View"
                    >
                      <List size={18} />
                    </button>
                  </div>
                </div>
              </div>
              
              {filteredExams.length === 0 ? (
                <div className="border border-dashed border-dark-700 bg-dark-900/20 py-12 text-center text-xs text-gray-400 rounded-xl">
                  {searchQuery ? 'No exams match your search.' : 'There are no exams available at the moment.'}
                </div>
              ) : viewMode === 'list' ? (
                <div className="overflow-x-auto rounded-xl border border-dark-700 bg-dark-850 shadow-sm">
                  <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-lime-50 text-xs text-lime-800 uppercase border-b border-lime-200">
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
                          <tr key={exam.unique_id || exam.id} className="hover:bg-dark-900 transition-colors">
                            <td className="px-6 py-4">
                              <h4 className="font-bold text-gray-100">{exam.title}</h4>
                            </td>
                            <td className="px-6 py-4">
                              {exam.university_name && <p className="text-xs text-lime-600 font-semibold">{exam.university_name}</p>}
                              {(exam.course_name || exam.course_code) && (
                                <p className="text-[11px] text-gray-400 font-medium">
                                  {exam.course_name} {exam.course_code && `(${exam.course_code})`}
                                </p>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1 text-xs text-gray-400">
                                <p className="flex items-center gap-1.5"><Calendar size={13} /> {new Date(exam.exam_date).toLocaleString()}</p>
                                <p className="flex items-center gap-1.5"><Hourglass size={13} /> {exam.duration_minutes} Mins</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {exam.exam_status === 'completed' ? (
                                <span className="bg-lime-50 text-lime-700 border border-lime-250 px-2.5 py-0.5 rounded text-[10px] font-bold">Score: {exam.score}</span>
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
                                <span className="text-xs font-semibold text-lime-700">Completed</span>
                              ) : (
                                <button
                                  onClick={() => handleOpenPasswordModal(exam.id)}
                                  className="lime-btn w-full py-1.5 px-3 text-xs flex items-center justify-center gap-1"
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
                      <div key={exam.unique_id || exam.id} className="border border-dark-700 p-5 rounded-2xl flex flex-col justify-between bg-dark-850 relative hover:shadow-md smooth-transition">
                        <div>
                          <div className="flex justify-end items-start mb-3">
                            {exam.exam_status === 'completed' ? (
                              <span className="bg-lime-50 text-lime-700 border border-lime-250 px-2.5 py-0.5 rounded text-[10px] font-bold">
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

                          <h4 className="font-bold text-gray-100 text-sm mb-2">{exam.title}</h4>

                          <div className="mb-4">
                             {exam.university_name && <p className="text-xs text-lime-600 font-semibold truncate" title={exam.university_name}>{exam.university_name}</p>}
                             {(exam.course_name || exam.course_code) && (
                               <p className="text-[11px] text-gray-400 font-medium truncate" title={`${exam.course_name || ''} ${exam.course_code || ''}`}>
                                 {exam.course_name} {exam.course_code && `(${exam.course_code})`}
                               </p>
                             )}
                          </div>

                          <div className="space-y-1.5 text-[11px] text-gray-400 border-t border-gray-100 pt-3">
                            <p className="flex items-center gap-1.5"><Calendar size={13} /> {new Date(exam.exam_date).toLocaleString()}</p>
                            <p className="flex items-center gap-1.5"><Hourglass size={13} /> {exam.duration_minutes} Mins Limit</p>
                          </div>
                        </div>

                        <div className="mt-5 pt-2">
                          {isFinished ? (
                            <div className="bg-lime-50/35 border border-lime-100 rounded-xl p-3 text-center text-xs font-semibold text-lime-800">
                              Exam Completed Successfully
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenPasswordModal(exam.id)}
                              className="lime-btn w-full py-2.5 text-xs flex items-center justify-center gap-1"
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
                  <h3 className="text-lg font-bold text-gray-100">My Exam Results</h3>
                </div>

                {completedExams.length === 0 ? (
                  <div className="border border-dashed border-dark-700 bg-dark-900/20 py-12 text-center text-xs text-gray-400 rounded-xl">
                    You haven't completed any exams yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-dark-700 bg-dark-850 shadow-sm">
                    <table className="w-full text-left text-sm text-gray-400">
                      <thead className="bg-lime-50 text-xs text-lime-800 uppercase border-b border-lime-200">
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
                            <tr key={exam.unique_id || exam.id} className="hover:bg-dark-900 transition-colors">
                              <td className="px-6 py-4">
                                <h4 className="font-bold text-gray-100">{exam.title}</h4>
                              </td>
                              <td className="px-6 py-4">
                                {exam.university_name && <p className="text-xs text-lime-600 font-semibold">{exam.university_name}</p>}
                                {(exam.course_name || exam.course_code) && (
                                  <p className="text-[11px] text-gray-400 font-medium">
                                    {exam.course_name} {exam.course_code && `(${exam.course_code})`}
                                  </p>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1 text-xs text-gray-400">
                                  <p className="flex items-center gap-1.5"><Calendar size={13} /> {new Date(exam.finished_at).toLocaleString()}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {isPublished ? (
                                  <span className="bg-lime-50 text-lime-700 border border-lime-250 px-3 py-1 rounded-lg text-xs font-bold shadow-sm">
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
          {activeTab === "profile" && (
            <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
              {/* Profile Card with Banner */}
              <div className="bg-dark-850 rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
                
                {/* Gradient Banner */}
                <div className="h-40 w-full bg-gradient-to-r from-lime-500 via-lime-400 to-lime-600 relative">
                  <div className="absolute top-4 right-4">
                    <button
                      type="button"
                      onClick={() => setIsProfileModalOpen(true)}
                      className="px-5 py-2.5 bg-dark-850/20 hover:bg-dark-850/30 text-white backdrop-blur-md text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
                    >
                      <Edit size={16} />
                      Edit Profile
                    </button>
                  </div>
                </div>

                {/* Profile Details Area */}
                <div className="px-8 pb-10 relative">
                  {/* Profile Picture */}
                  <div className="absolute -top-16 left-8">
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-dark-850 p-1.5 shadow-xl">
                      <div className="w-full h-full rounded-full overflow-hidden bg-dark-800">
                        {profile.profile_image ? (
                          <img src={"http://localhost:5000" + profile.profile_image} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lime-300 bg-lime-50">
                            <User className="w-16 h-16" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-20">
                    <h2 className="text-3xl font-extrabold text-gray-100">{profile.name}</h2>
                    <p className="text-lime-500 font-bold mb-6">Student (ID: {profile.id})</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                      <div className="space-y-4">
                        <div className="bg-dark-900 p-4 rounded-2xl border border-gray-100/50">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Email Address</p>
                          <p className="text-gray-200 font-medium">{profile.email}</p>
                        </div>
                        <div className="bg-dark-900 p-4 rounded-2xl border border-gray-100/50">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Date of Birth</p>
                          <p className="text-gray-200 font-medium">
                            {profile.dob ? new Date(profile.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not provided'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="bg-dark-900 p-4 rounded-2xl border border-gray-100/50">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">University / Institution</p>
                          <p className="text-gray-200 font-medium">{profile.university || 'Not provided'}</p>
                        </div>
                        <div className="bg-dark-900 p-4 rounded-2xl border border-gray-100/50">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Address</p>
                          <p className="text-gray-200 font-medium">{profile.address || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="bg-dark-850 p-8 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-100 mb-6 flex items-center gap-2">
                  <KeyRound size={20} className="text-lime-500" />
                  Security Options
                </h3>
                
                <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase">Current Password <span className="text-red-500 ml-1">*</span></label>
                    <div className="relative">
                      <input 
                        type={showOldPassword ? "text" : "password"} required placeholder="••••••••"
                        value={pwData.oldPassword}
                        onChange={e => setPwData({ ...pwData, oldPassword: e.target.value })}
                        className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:border-lime-500 smooth-transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-lime-400 smooth-transition"
                      >
                        {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase">New Password <span className="text-red-500 ml-1">*</span></label>
                    <div className="relative">
                      <input 
                        type={showNewPassword ? "text" : "password"} required placeholder="••••••••"
                        value={pwData.newPassword}
                        onChange={e => setPwData({ ...pwData, newPassword: e.target.value })}
                        className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:border-lime-500 smooth-transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-lime-400 smooth-transition"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="lime-btn w-full py-2.5 mt-4 text-sm">
                    Update Password
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
        
        {/* Footer */}
        <div className="mt-auto text-center text-gray-400 text-xs py-4 pb-24 lg:pb-4 border-t border-dark-700">
          Developed by MD Mehedi Hasan (232004048) and MST Onamika Jannat Ara (232005048) for the final Project
        </div>
      </div>


      {/* POPUP MODALS */}
      {/* Profile Edit Modal */}
      {isProfileModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-dark-850 z-10">
              <h2 className="text-xl font-bold text-gray-200">Edit Profile</h2>
              <button type="button" onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-dark-700 rounded-full transition">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                      Full Name <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:bg-dark-850 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 smooth-transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                      Email <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:bg-dark-850 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 smooth-transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={profileDob}
                      onChange={(e) => setProfileDob(e.target.value)}
                      className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:bg-dark-850 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 smooth-transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                      University / Institution
                    </label>
                    <input
                      type="text"
                      value={profileUniversity}
                      onChange={(e) => setProfileUniversity(e.target.value)}
                      placeholder="e.g. Dhaka University"
                      className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:bg-dark-850 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 smooth-transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                    Address
                  </label>
                  <textarea
                    rows="2"
                    value={profileAddress}
                    onChange={(e) => setProfileAddress(e.target.value)}
                    placeholder="Full address"
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:bg-dark-850 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 smooth-transition"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                    Profile Picture Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const img = new Image();
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            let width = img.width;
                            let height = img.height;
                            const max_size = 500;
                            if (width > height) {
                              if (width > max_size) {
                                height *= max_size / width;
                                width = max_size;
                              }
                            } else {
                              if (height > max_size) {
                                width *= max_size / height;
                                height = max_size;
                              }
                            }
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);
                            canvas.toBlob((blob) => {
                              const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                              });
                              setProfileImageFile(compressedFile);
                            }, 'image/jpeg', 0.6);
                          };
                          img.src = event.target.result;
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-lime-50 file:text-lime-700 hover:file:bg-lime-100 smooth-transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-lime-500 text-white rounded-xl font-bold hover:bg-lime-600 smooth-transition shadow-sm"
                >
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPasswordModalOpen(false)} />
          <div className="bg-dark-850 rounded-2xl w-full max-w-sm shadow-xl z-10 overflow-hidden animate-fade-in flex flex-col">
            <div className="p-5 border-b border-dark-700 flex justify-between items-center bg-dark-900/50">
              <h3 className="font-bold text-gray-100">Exam Verification</h3>
              <button onClick={() => setPasswordModalOpen(false)} className="text-gray-400 hover:text-lime-400 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6">
              {modalError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl font-medium">
                  {modalError}
                </div>
              )}
              <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase">Enter Exam Password</label>
              <input 
                type="password" 
                name="exam_password_dummy"
                autoComplete="new-password"
                value={examPasswordInput}
                onChange={e => setExamPasswordInput(e.target.value)}
                placeholder="Required for live exams"
                className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:border-lime-500 smooth-transition"
                autoFocus
              />
              <p className="text-[10px] text-gray-400 mt-2 text-center">Contact your instructor if you don't have the password.</p>
              
              <button 
                onClick={handleStartExamSubmit}
                disabled={startingExam}
                className="lime-btn w-full py-2.5 mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {startingExam ? <RefreshCw className="animate-spin" size={16} /> : null}
                {startingExam ? 'Verifying...' : 'Proceed to Exam'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Mobile Bottom Navigation Bar */}
      {(() => {
        const mobileTabs = [
          { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { id: 'exams', label: 'Exams', icon: FileText },
          { id: 'events', label: 'Events', icon: Calendar },
          { id: 'results', label: 'Results', icon: CheckCircle2 },
          { id: 'profile', label: 'Profile', icon: Settings }
        ];
        const activeIdx = mobileTabs.findIndex(t => t.id === activeTab);
        const currentIndex = activeIdx !== -1 ? activeIdx : 0;
        const tabWidth = 100 / mobileTabs.length;

        return (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-dark-850 border-t border-dark-700 z-50 flex items-center justify-between pb-safe shadow-[0_-8px_16px_-4px_rgba(0,0,0,0.05)]">
            {/* Animated Top Line */}
            <div 
              className="absolute top-0 h-1 bg-lime-500 rounded-b-full transition-all duration-300 ease-in-out shadow-sm"
              style={{
                width: '32px',
                left: `calc(${(currentIndex * tabWidth)}% + ${tabWidth / 2}% - 16px)`
              }}
            />
            {mobileTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center w-full py-2.5 transition-all duration-300 ${activeTab === tab.id ? 'text-lime-400' : 'text-gray-400 hover:text-gray-400'}`}
              >
                <tab.icon size={20} className={`mb-1 transition-transform duration-300 ${activeTab === tab.id ? 'scale-110 drop-shadow-sm' : ''}`} />
                <span className={`text-[9px] font-bold truncate max-w-full transition-all duration-300 ${activeTab === tab.id ? 'opacity-100' : 'opacity-80 font-medium'}`}>{tab.label}</span>
              </button>
            ))}
          </div>
        );
      })()}
    </div>
  );
}