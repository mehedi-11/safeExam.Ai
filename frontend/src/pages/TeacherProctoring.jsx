import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";
import { 
  ArrowLeft, Camera, RefreshCw, ShieldAlert, Users, 
  CheckCircle, Clock, LogIn, FileText, Layers, X, Sparkles,
  WifiOff, Wifi
} from "lucide-react";

export default function TeacherProctoring() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ totalJoined: 0, totalSubmitted: 0, totalInExam: 0, students: [] });
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [selectedStudentTab, setSelectedStudentTab] = useState('all');

  const fetchLiveLogs = async () => {
    try {
      const response = await api.get(`/teacher/exams/${examId}/live-logs`);
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error("Error fetching live logs", error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchLiveStats = async () => {
    try {
      const response = await api.get(`/teacher/exams/${examId}/live-stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching live stats", error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchLiveLogs();
    fetchLiveStats();
    
    // Polling intervals
    const logsInterval = setInterval(fetchLiveLogs, 3000);
    const statsInterval = setInterval(fetchLiveStats, 5000);
    
    return () => {
      clearInterval(logsInterval);
      clearInterval(statsInterval);
    };
  }, [examId]);

  // Filter logs by selected student tab
  const displayLogs = logs.filter(logStr => {
    if (selectedStudentTab === 'all') return true;
    const match = logStr.match(/^\[(.*?)\]\s*-\s*(.*?)\s*-\s*(.*?)\s*-\s*(.*)$/);
    if (!match) return false;
    const studentId = match[3]?.trim();
    return studentId === selectedStudentTab;
  });

  // Helper count of events for each student
  const getStudentLogCount = (studentId) => {
    return logs.filter(logStr => {
      const match = logStr.match(/^\[(.*?)\]\s*-\s*(.*?)\s*-\s*(.*?)\s*-\s*(.*)$/);
      return match && match[3]?.trim() === studentId;
    }).length;
  };

  const activeStudent = stats.students?.find(s => s.student_id === selectedStudentTab);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans h-screen overflow-hidden">
      {/* Header matching Student Exam UI */}
      <div className="bg-white border-b border-gray-200 p-4 px-6 flex justify-between items-center shadow-md shadow-gray-200/50 z-10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              const user = JSON.parse(localStorage.getItem("user") || "{}");
              const role = user.role || localStorage.getItem("role");
              navigate(role === "admin" ? "/dashboard/admin" : "/dashboard/teacher");
            }}
            className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-tomato-400 smooth-transition"
            title="Back to Dashboard"
          >
            <ArrowLeft size={14} />
            <span>Back to Dashboard</span>
          </button>
          <div className="h-6 w-px bg-gray-200 mx-2"></div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2 leading-tight">
              Live Proctoring Console
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Exam ID: {examId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-tomato-50 border border-tomato-100 text-tomato-650 px-3 py-1.5 rounded-lg text-xs font-bold shadow-md shadow-gray-200/50">
          <div className="w-2 h-2 bg-gray-900 rounded-full animate-pulse"></div>
          Monitoring Live
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-grow max-w-7xl w-full mx-auto p-4 flex flex-col gap-4 overflow-hidden">
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-md shadow-gray-200/50 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Joined</p>
              <h2 className="text-2xl font-black text-gray-900">{loadingStats ? '-' : stats.totalJoined}</h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-tomato-50 flex items-center justify-center text-tomato-400">
              <Users size={20} />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-md shadow-gray-200/50 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Still In Exam</p>
              <h2 className="text-2xl font-black text-gray-900">{loadingStats ? '-' : stats.totalInExam}</h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
              <Clock size={20} />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-md shadow-gray-200/50 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Submitted</p>
              <h2 className="text-2xl font-black text-gray-900">{loadingStats ? '-' : stats.totalSubmitted}</h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-tomato-50 flex items-center justify-center text-tomato-400">
              <CheckCircle size={20} />
            </div>
          </div>
        </div>

        {/* Two-Column Layout: Left (Incident Feed) and Right (Student Roster Tabs) */}
        <div className="flex flex-row gap-4 flex-1 overflow-hidden min-h-0">
          
          {/* Left Column: AI Log Feed (68%) */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-md shadow-gray-200/50 flex flex-col w-[68%] overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-tomato-400" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700">
                  AI Incident Log Feed
                </h4>
                {selectedStudentTab !== 'all' ? (
                  <div className="flex items-center gap-1.5 ml-2 bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded-full text-xs font-medium">
                    <span>Filtering: <span className="font-bold text-gray-900">{activeStudent?.student_name || selectedStudentTab}</span></span>
                    <button 
                      onClick={() => setSelectedStudentTab('all')} 
                      className="text-gray-400 hover:text-gray-700 ml-1"
                      title="Reset filter"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-medium">
                    All Feed
                  </span>
                )}
              </div>
              <div className="text-[11px] font-mono text-gray-500">
                {displayLogs.length} Events Recorded
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="text-gray-900 border-b border-gray-200 sticky top-0 z-10 bg-white">
                  <tr className="border-b border-gray-200">
                    <th className="py-2.5 px-4 font-bold text-[10px] text-left uppercase tracking-widest border-b border-gray-200">Time</th>
                    <th className="py-2.5 px-4 font-bold text-[10px] text-left uppercase tracking-widest border-b border-gray-200">Student</th>
                    <th className="py-2.5 px-4 font-bold text-[10px] text-left uppercase tracking-widest border-b border-gray-200">Incident Detail</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {loadingLogs && logs.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <RefreshCw className="animate-spin text-tomato-400" size={24} />
                          <p className="font-normal text-xs">Connecting to live feed...</p>
                        </div>
                      </td>
                    </tr>
                  ) : displayLogs.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <ShieldAlert size={32} className="opacity-20 text-gray-400" />
                          <p className="font-normal text-xs text-gray-500">
                            {selectedStudentTab === 'all' 
                              ? 'No activity or incidents detected yet' 
                              : `No logged activity for ${activeStudent?.student_name || selectedStudentTab}`}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayLogs.map((logStr, idx) => {
                      const regex = /^\[(.*?)\]\s*-\s*(.*?)\s*-\s*(.*?)\s*-\s*(.*)$/;
                      const match = logStr.match(regex);
                      let time = '-', name = 'System', id = '-', incident = logStr;
                      if (match) {
                        time = match[1];
                        name = match[2];
                        id = match[3];
                        incident = match[4];
                      }

                      const lowerIncident = incident.toLowerCase();
                      const isSubmission = lowerIncident.includes('submission') || lowerIncident.includes('submitted');
                      const isReload = lowerIncident.includes('reload') || lowerIncident.includes('refresh') || lowerIncident.includes('f5');
                      const isNetwork = lowerIncident.includes('network') || lowerIncident.includes('offline') || lowerIncident.includes('disconnect') || lowerIncident.includes('reconnect');
                      const isJoin = lowerIncident.includes('student join') || lowerIncident.includes('joined the exam') || lowerIncident.includes('re-entered');
                      const isShortcut = lowerIncident.includes('shortcut') || lowerIncident.includes('clipboard') || lowerIncident.includes('copy') || lowerIncident.includes('paste');
                      const isTabSwitch = lowerIncident.includes('tab switch') || lowerIncident.includes('window blur') || lowerIncident.includes('left exam page') || lowerIncident.includes('lost window focus');

                      let rowBg = 'hover:bg-red-50/20 bg-red-50/5';
                      if (isReload) {
                        rowBg = 'hover:bg-red-50/40 bg-red-50/15';
                      } else if (isNetwork) {
                        rowBg = 'hover:bg-amber-50/40 bg-amber-50/15';
                      } else if (isSubmission) {
                        rowBg = 'hover:bg-emerald-50/40 bg-emerald-50/10';
                      } else if (isJoin) {
                        rowBg = 'hover:bg-blue-50/40 bg-blue-50/10';
                      } else if (isShortcut) {
                        rowBg = 'hover:bg-purple-50/40 bg-purple-50/10';
                      } else if (isTabSwitch) {
                        rowBg = 'hover:bg-amber-50/40 bg-amber-50/10';
                      }

                      return (
                        <tr key={idx} className={`border-b border-gray-100 transition-colors ${rowBg}`}>
                          <td className="py-2.5 px-4 font-mono text-gray-500 whitespace-nowrap text-xs font-normal">
                            {time}
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="text-gray-900 font-medium">{name}</div>
                            <div className="text-gray-500 font-mono text-[10px] font-normal">{id}</div>
                          </td>
                          <td className="py-2.5 px-4">
                            {isReload ? (
                              <span className="text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 font-medium">
                                <RefreshCw size={12} className="text-red-600 shrink-0" />
                                <span>{incident}</span>
                              </span>
                            ) : isNetwork ? (
                              <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 font-medium">
                                <WifiOff size={12} className="text-amber-600 shrink-0" />
                                <span>{incident}</span>
                              </span>
                            ) : isSubmission ? (
                              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 font-medium">
                                <CheckCircle size={12} className="text-emerald-600 shrink-0" />
                                <span>{incident}</span>
                              </span>
                            ) : isJoin ? (
                              <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 font-medium">
                                <LogIn size={12} className="text-blue-600 shrink-0" />
                                <span>{incident}</span>
                              </span>
                            ) : isShortcut ? (
                              <span className="text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 font-medium">
                                <FileText size={12} className="text-purple-600 shrink-0" />
                                <span>{incident}</span>
                              </span>
                            ) : isTabSwitch ? (
                              <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 font-medium">
                                <Clock size={12} className="text-amber-600 shrink-0" />
                                <span>{incident}</span>
                              </span>
                            ) : (
                              <span className="text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 font-medium">
                                <ShieldAlert size={12} className="text-red-500 shrink-0" />
                                <span>{incident}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Student Roster Tabs (32%) */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-md shadow-gray-200/50 flex flex-col w-[32%] overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Users size={14} className="text-tomato-400" />
                <span>Student Roster Tabs</span>
              </h4>
              <span className="text-[11px] font-mono text-gray-500">
                {stats.students?.length || 0} Students
              </span>
            </div>

            {/* All Feed Button at Top of Roster */}
            <div className="p-3 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
              <button
                onClick={() => setSelectedStudentTab('all')}
                className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all shadow-sm ${
                  selectedStudentTab === 'all'
                    ? 'bg-gray-900 text-white shadow-gray-900/20'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers size={14} className={selectedStudentTab === 'all' ? 'text-white' : 'text-gray-500'} />
                  <span>All Students Feed</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  selectedStudentTab === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {logs.length}
                </span>
              </button>
            </div>
            
            {/* Scrollable list of students as interactive Tab Buttons */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {stats.students && stats.students.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-xs">
                  No students have joined yet.
                </div>
              ) : (
                [...(stats.students || [])].sort((a, b) => new Date(a.started_at) - new Date(b.started_at)).map((student, idx) => {
                  const isSelected = selectedStudentTab === student.student_id;
                  const studentLogsCount = getStudentLogCount(student.student_id);

                  return (
                    <button
                      key={student.student_id || idx}
                      onClick={() => setSelectedStudentTab(student.student_id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-2 relative ${
                        isSelected
                          ? 'border-gray-900 bg-gray-50 shadow-sm ring-1 ring-gray-900/10'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60'
                      }`}
                    >
                      {/* Top row: Name, ID, and Status */}
                      <div className="flex items-center justify-between w-full">
                        <div className="min-w-0 pr-2">
                          <div className={`text-xs truncate ${isSelected ? 'font-bold text-gray-950' : 'font-semibold text-gray-900'}`}>
                            {student.student_name}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            ID: {student.student_id}
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider shrink-0 font-medium ${
                          ['completed', 'finished'].includes(student.status) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          student.is_offline ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse' :
                          ['started', 'in_progress'].includes(student.status) ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {['completed', 'finished'].includes(student.status) ? 'Submitted' :
                           student.is_offline ? 'Offline (Net Lost)' :
                           ['started', 'in_progress'].includes(student.status) ? 'In Exam' : student.status}
                        </span>
                      </div>

                      {/* Bottom row: Time, Demerits, and Events count */}
                      <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pt-1.5 border-t border-gray-100 w-full">
                        <div className="truncate pr-1">
                          In: {new Date(student.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {student.completed_at && ` • Out: ${new Date(student.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            student.demerit_points >= 8 ? 'bg-red-100 text-red-700' :
                            student.demerit_points > 0 ? 'bg-amber-100 text-amber-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {student.demerit_points} / 10 pts
                          </span>
                          <span className="text-[9px] text-gray-400 bg-gray-100 px-1 py-0.5 rounded">
                            {studentLogsCount} ev
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
