import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";
import { ArrowLeft, Camera, RefreshCw, ShieldAlert, Users, CheckCircle, Clock } from "lucide-react";

export default function TeacherProctoring() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ totalJoined: 0, totalSubmitted: 0, totalInExam: 0, students: [] });
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans h-screen overflow-hidden">
      {/* Header matching Student Exam UI */}
      <div className="bg-white border-b border-gray-150 p-4 px-6 flex justify-between items-center shadow-sm z-10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard/teacher")}
            className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-tomato-500 smooth-transition"
          >
            <ArrowLeft size={14} />
            <span>Back to Dashboard</span>
          </button>
          <div className="h-6 w-px bg-gray-200 mx-2"></div>
          <div>
            <h1 className="text-lg font-bold text-dark-900 flex items-center gap-2 leading-tight">
              <Camera size={18} className="text-tomato-500" />
              Live Proctoring Console
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Exam ID: {examId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-tomato-50 border border-tomato-100 text-tomato-650 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
          <div className="w-2 h-2 bg-tomato-500 rounded-full animate-pulse"></div>
          Monitoring Live
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-grow max-w-7xl w-full mx-auto p-4 flex flex-col gap-4 overflow-hidden">
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
          <div className="bg-white border border-gray-150 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Joined</p>
              <h2 className="text-2xl font-black text-dark-900">{loadingStats ? '-' : stats.totalJoined}</h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
              <Users size={20} />
            </div>
          </div>
          <div className="bg-white border border-gray-150 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Still In Exam</p>
              <h2 className="text-2xl font-black text-dark-900">{loadingStats ? '-' : stats.totalInExam}</h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
              <Clock size={20} />
            </div>
          </div>
          <div className="bg-white border border-gray-150 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Submitted</p>
              <h2 className="text-2xl font-black text-dark-900">{loadingStats ? '-' : stats.totalSubmitted}</h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500">
              <CheckCircle size={20} />
            </div>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="flex flex-row gap-4 flex-1 overflow-hidden min-h-0">
          
          {/* Left Column: Student Table (60%) */}
          <div className="bg-white border border-gray-150 rounded-xl shadow-sm flex flex-col w-[30%] order-2 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Users size={14} className="text-tomato-500" />
                <span>Student Roster</span>
              </h4>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="py-2.5 px-4 font-bold text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-150">Student</th>
                    <th className="py-2.5 px-4 font-bold text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-150">Time (Join - Submit)</th>
                    <th className="py-2.5 px-4 font-bold text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-150">Demerits</th>
                    <th className="py-2.5 px-4 font-bold text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-150">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {stats.students.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-gray-400">No students have joined yet.</td>
                    </tr>
                  ) : (
                    stats.students.map((student, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-dark-900">{student.student_name}</div>
                          <div className="text-gray-400 font-mono text-[10px]">{student.student_id}</div>
                        </td>
                        <td className="py-2.5 px-4 text-gray-600 font-mono text-[10px]">
                          <div>In: {new Date(student.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          <div>Out: {student.completed_at ? new Date(student.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${student.demerit_points > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                            {student.demerit_points}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            ['completed', 'finished'].includes(student.status) ? 'bg-green-100 text-green-700' :
                            ['started', 'in_progress'].includes(student.status) ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {['completed', 'finished'].includes(student.status) ? 'Submitted' :
                             ['started', 'in_progress'].includes(student.status) ? 'In Exam' : student.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: AI Log Feed (40%) */}
          <div className="bg-white border border-gray-150 rounded-xl shadow-sm flex flex-col w-[70%] order-1 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Camera size={14} className="text-tomato-500" />
                <span>AI Incident Log Feed</span>
              </h4>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm">
                    <tr>
                      <th className="py-2.5 px-4 font-bold text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-150">Time</th>
                      <th className="py-2.5 px-4 font-bold text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-150">Student</th>
                      <th className="py-2.5 px-4 font-bold text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-150">Incident Detail</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {loadingLogs && logs.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="py-8 text-center text-gray-400">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <RefreshCw className="animate-spin text-tomato-500" size={24} />
                            <p>Connecting to live feed...</p>
                          </div>
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="py-8 text-center text-gray-400">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <ShieldAlert size={32} className="opacity-20" />
                            <p>No suspicious activity detected yet</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      logs.slice().reverse().map((logStr, idx) => {
                        const regex = /^\[(.*?)\]\s*-\s*(.*?)\s*-\s*(.*?)\s*-\s*(.*)$/;
                        const match = logStr.match(regex);
                        let time = '-', name = 'System', id = '-', incident = logStr;
                        if (match) {
                          time = match[1];
                          name = match[2];
                          id = match[3];
                          incident = match[4];
                        }
                        return (
                          <tr key={idx} className="border-b border-gray-100 hover:bg-red-50/30 transition-colors">
                            <td className="py-3 px-4 font-mono text-gray-500 whitespace-nowrap">{time}</td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-dark-900">{name}</div>
                              <div className="text-gray-400 font-mono text-[10px]">{id}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-red-600 font-medium bg-red-50 px-2 py-1 rounded-md">{incident}</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
