import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api, { API_BASE_URL } from '../api/axiosConfig';
import { 
  Camera, ShieldAlert, AlertTriangle, Play, HelpCircle, 
  CheckSquare, ArrowLeft, Clock, ShieldCheck, Terminal
} from 'lucide-react';

export default function ExamInterface() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve password from state or sessionStorage
  const password = location.state?.password || sessionStorage.getItem(`exam_pwd_${examId}`) || '';
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Webcam stream
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const wsRef = useRef(null);
  const canvasRef = useRef(null);

  // Exam state
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0); // Seconds
  const [demerits, setDemerits] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeLeft, setBlockTimeLeft] = useState(0); // Block countdown seconds
  const [examStarted, setExamStarted] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [examDetails, setExamDetails] = useState(null);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [limitReached, setLimitReached] = useState(false);
  const [showLogFeed, setShowLogFeed] = useState([]); // Local log stream on exam screen

  // API setup centralized in axiosConfig
  // 1. Initial Exam Check & Webcam access
  useEffect(() => {
    if (!token) {
      navigate('/login/student');
      return;
    }
    initExam();
    startWebcam();

    return () => {
      stopWebcam();
    };
  }, [examId]);

  // 2. Client-side cheating triggers (Copy/Paste hooks, Focus tracking)
  useEffect(() => {
    if (!examStarted || isBlocked) return;

    // Detect Copy shortcut (Ctrl+C / Cmd+C / Ctrl+V / Ctrl+X)
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'v' || e.key.toLowerCase() === 'x')) {
        e.preventDefault();
        logCheating('Shortcut Activity', 'Student attempted Ctrl+C/V/X shortcut.');
      }
    };

    // Detect Tab Switching
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logCheating('Tab Switching', 'Student switched to another tab or minimized the window.');
      }
    };

    // Detect clicking outside the window
    const handleWindowBlur = () => {
      logCheating('Window Blur', 'Student clicked outside the exam window or lost focus.');
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [examStarted, isBlocked]);

  // 3. Exam Timer (Ticks every second)
  useEffect(() => {
    if (!examStarted || isBlocked || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam(true); // Auto-submit when time is up
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 5. Auto-Save Interval (Every 30 seconds)
    const autoSaveTimer = setInterval(async () => {
      if (Object.keys(answers).length > 0) {
        try {
          await api.post(`/student/exams/${examId}/auto-save`, { answers });
        } catch (err) {
          console.warn('Auto-save failed', err);
        }
      }
    }, 30000);

    // 6. Detect page close/refresh
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome to show the warning
      logCheating('Exit Attempt', 'Student tried to close or refresh the exam page early.');
    };

    const handleUnload = () => {
      if (Object.keys(answers).length > 0) {
        const payload = JSON.stringify({ answers });
        fetch(`${API_BASE_URL}/api/student/exams/${examId}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: payload,
          keepalive: true
        }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      clearInterval(timer);
      clearInterval(autoSaveTimer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [examStarted, isBlocked, timeLeft, answers, examId]);

  // 4. Block countdown Timer (Ticks every second if blocked)
  useEffect(() => {
    if (!isBlocked || blockTimeLeft <= 0) {
      if (isBlocked && blockTimeLeft <= 0) {
        setIsBlocked(false);
        initExam(); // Re-verify status on backend
      }
      return;
    }

    const blockTimer = setInterval(() => {
      setBlockTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(blockTimer);
          setIsBlocked(false);
          // Reload exam questions
          loadQuestions();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(blockTimer);
  }, [isBlocked, blockTimeLeft]);

  // Init Exam: Start attempt and fetch exam parameters
  const initExam = async () => {
    setLoading(true);
    setError('');
    try {
      // Start/Get exam attempt
      const attemptRes = await api.post(`/student/exams/${examId}/start`, { exam_password: password });
      const attempt = attemptRes.data;

      setDemerits(attempt.demerit_points);

      // Verify block status
      if (attempt.block_until && new Date(attempt.block_until) > new Date()) {
        setIsBlocked(true);
        const diff = Math.ceil((new Date(attempt.block_until) - new Date()) / 1000);
        setBlockTimeLeft(diff);
      }

      // Fetch exams catalog for duration and title
      const examsRes = await api.get('/student/exams');
      const activeExam = examsRes.data.find(e => e.id === parseInt(examId));
      if (activeExam) {
        setExamTitle(activeExam.title);
        setExamDetails(activeExam);
        // Calculate remaining duration
        const durationSec = activeExam.duration_minutes * 60;
        const elapsedSec = Math.floor((new Date() - new Date(attempt.started_at)) / 1000);
        const remaining = durationSec - elapsedSec;
        setTimeLeft(remaining > 0 ? remaining : 0);
      }

      if (!isBlocked) {
        await loadQuestions();
      }

      setExamStarted(true);
    } catch (err) {
      if (err.response?.data?.limit_reached) {
        setLimitReached(true);
      } else {
        setError(err.response?.data?.message || 'Error initializing exam session.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    try {
      const [qRes, aRes] = await Promise.all([
        api.get(`/student/exams/${examId}/questions`),
        api.get(`/student/exams/${examId}/answers`)
      ]);
      setQuestions(qRes.data);
      if (aRes.data) {
        setAnswers(aRes.data);
      }
    } catch (err) {
      setError('Could not load questions: ' + (err.response?.data?.message || 'Blocked'));
    }
  };

  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Webcam permission denied or unavailable:', err);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  // Connect to AI WebSocket when exam starts
  useEffect(() => {
    if (!examStarted || !streamRef.current || !examDetails) return;

    const queryParams = new URLSearchParams({
      exam_name: examDetails.title || 'Unknown_Exam',
      university_name: examDetails.university_name || 'Unknown_University',
      course_name: examDetails.course_name || 'Unknown_Course',
      course_code: examDetails.course_code || '',
      student_name: user.name || 'Unknown_Student'
    }).toString();

    wsRef.current = new WebSocket(`ws://localhost:8000/ws/proctor/${examId}/${user.id}?${queryParams}`);
    
    wsRef.current.onopen = () => {
      console.log('Connected to AI Proctoring Server');
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.status === 'warning') {
        const items = data.items.map(i => i.item).join(', ');
        logCheating('AI Detection', `YOLOv8 detected: ${items}`);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    // Frame capture loop (5 FPS)
    const frameInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && videoRef.current) {
        const canvas = canvasRef.current;
        if (canvas) {
          const context = canvas.getContext('2d');
          context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const base64Frame = canvas.toDataURL('image/jpeg', 0.5); // 0.5 quality
          wsRef.current.send(base64Frame);
        }
      }
    }, 200);

    return () => {
      clearInterval(frameInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [examStarted]);

  // Log a cheating event (Actual copy/paste or Simulated YOLOv8)
  const logCheating = async (activityType, details) => {
    // Add to local console feed
    const now = new Date().toLocaleTimeString();
    setShowLogFeed(prev => [`[${now}] Triggered: ${activityType}`, ...prev.slice(0, 4)]);

    try {
      const res = await api.post('/proctor/log-incident', {
        examId: parseInt(examId),
        studentId: user.id,
        activityType,
        details
      });

      setDemerits(res.data.demerit_points);

      // Handle locking on the fly
      if (res.data.status === 'blocked' || (res.data.block_until && new Date(res.data.block_until) > new Date())) {
        setIsBlocked(true);
        const diff = Math.ceil((new Date(res.data.block_until) - new Date()) / 1000);
        setBlockTimeLeft(diff);
        setQuestions([]); // Hide active questions immediately
      }
    } catch (err) {
      console.error('Error reporting proctor alert:', err);
    }
  };

  // Submit Exam
  const handleSubmitExam = async (isAuto = false) => {
    try {
      const res = await api.post(`/student/exams/${examId}/submit`, { answers });
      alert(isAuto ? 'Time is up! Your exam has been auto-submitted.' : 'Exam submitted successfully.');
      navigate('/dashboard/student');
    } catch (err) {
      alert('Error submitting exam: ' + (err.response?.data?.message || 'Server error'));
    }
  };

  const handleOptionChange = (questionId, option) => {
    setAnswers({ ...answers, [questionId]: option });
  };

  const handleClipboard = (e) => {
    e.preventDefault();
    logCheating('Clipboard Activity', 'Student attempted to use copy/cut/paste on the exam page');
  };

  // Helper formatting seconds -> MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Render Views
  if (limitReached) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border-t-4 border-red-500 animate-scale-up flex flex-col items-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <ShieldAlert size={40} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-dark-900 mb-2">Maximum Attempts Reached</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            You have already reached the maximum number of allowed attempts for this exam. You cannot take this exam again.
          </p>
          <button 
            onClick={() => window.close()} 
            className="w-full bg-gray-100 hover:bg-gray-200 text-dark-900 font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gray-50 flex flex-col font-sans"
      onCopy={handleClipboard}
      onCut={handleClipboard}
      onPaste={handleClipboard}
    >
      {/* Block Lock Overlay Screen */}
      {isBlocked && (
        <div className="fixed inset-0 z-50 bg-dark-900/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 select-none animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-tomato-500/10 border border-tomato-500/40 text-tomato-500 flex items-center justify-center mb-6 animate-pulse">
            <ShieldAlert size={44} />
          </div>
          
          <h1 className="text-3xl font-extrabold text-white tracking-tight leading-none mb-3">
            EXAM TEMPORARILY BLOCKED
          </h1>
          
          <p className="text-gray-400 text-sm max-w-lg mb-8 leading-relaxed">
            Your examination workspace has been locked due to multiple suspicious activities detected by the AI proctor. 
            All response fields are disabled. Attempting further cheating actions during lock extends the block duration.
          </p>

          <div className="bg-dark-850 border border-tomato-500/20 px-8 py-5 rounded-2xl mb-4">
            <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-1">Block Countdown</span>
            <span className="font-mono text-4xl font-extrabold text-tomato-500 tracking-wide">
              {formatTime(blockTimeLeft)}
            </span>
          </div>

          <div className="text-xs text-gray-500">
            Current Demerit Suspicion Score: <span className="text-red-500 font-bold">{demerits} / 5</span>
          </div>
          
          {/* Simulation panel during block (so they can test extending it) */}
          <div className="mt-12 bg-dark-850 p-4 border border-gray-800 rounded-xl max-w-sm w-full">
            <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider mb-2 text-left">Trigger Block Extension (+2m)</p>
            <div className="flex gap-2">
              <button 
                onClick={() => logCheating('talking', 'Simulated talking detection during block')}
                className="bg-red-950/40 border border-red-900/60 hover:bg-red-900/40 text-red-400 text-[10px] font-bold py-1.5 px-3 rounded-lg flex-1 smooth-transition"
              >
                Simulate Talking
              </button>
              <button 
                onClick={() => logCheating('watching phone', 'Simulated phone watch during block')}
                className="bg-red-950/40 border border-red-900/60 hover:bg-red-900/40 text-red-400 text-[10px] font-bold py-1.5 px-3 rounded-lg flex-1 smooth-transition"
              >
                Simulate Phone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exam Content Wrapper */}

      <div className="flex-grow max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Side: Exam content */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-gray-150 p-6 rounded-2xl flex justify-between items-center shadow-sm">
            <div>
              <button 
                onClick={() => { if(window.confirm('Abandon exam? Your progress will not be submitted.')) navigate('/dashboard/student'); }} 
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-tomato-500 mb-2 smooth-transition"
              >
                <ArrowLeft size={13} />
                <span>Exit Exam Portal</span>
              </button>
              <h2 className="text-xl font-bold text-dark-900 leading-tight">{examTitle || 'Loading Exam...'}</h2>
              <p className="text-xs text-gray-400 mt-1">Answer all multiple choice questions. Copy/paste checks are active.</p>
            </div>

            {/* Timer widget */}
            <div className="flex items-center gap-3 bg-tomato-50 text-tomato-650 py-2.5 px-4 rounded-xl border border-tomato-100 font-semibold shadow-sm">
              <Clock size={18} className="animate-pulse" />
              <div className="text-left font-mono">
                <span className="text-[10px] block uppercase text-tomato-500 font-bold leading-3">Time Left</span>
                <span className="text-lg font-bold">{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-fade-in">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Questions Render */}
          {questions.length === 0 && !loading && !isBlocked ? (
            <div className="bg-white border border-gray-150 py-16 text-center text-xs text-gray-400 rounded-2xl shadow-sm">
              Exam questions are not configured or are locked. Please contact your instructor.
            </div>
          ) : (
            <div className="space-y-6">
              {questions.map((q, idx) => (
                <div key={q.id} className="bg-white border border-gray-150 p-6 rounded-2xl shadow-sm">
                  <h4 className="font-bold text-dark-900 text-sm mb-4 leading-relaxed">
                    Question {idx + 1}: {q.question_text}
                  </h4>
                  <div className="mt-4">
                    {q.type === 'Written' ? (
                      <textarea
                        value={answers[q.id] || ''}
                        onChange={(e) => handleOptionChange(q.id, e.target.value)}
                        placeholder="Type your answer here..."
                        className="w-full h-32 p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-tomato-500 text-sm resize-none"
                      ></textarea>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { key: 'A', text: q.option_a },
                          { key: 'B', text: q.option_b },
                          { key: 'C', text: q.option_c },
                          { key: 'D', text: q.option_d }
                        ].map(opt => {
                          const isSelected = answers[q.id] === opt.key;
                          return (
                            <div 
                              key={opt.key}
                              onClick={() => handleOptionChange(q.id, opt.key)}
                              className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer smooth-transition ${
                                isSelected 
                                  ? 'border-tomato-500 bg-tomato-50/15 font-semibold text-tomato-800' 
                                  : 'border-gray-100 hover:border-tomato-200 hover:bg-gray-50/50 text-gray-650'
                              }`}
                            >
                              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-extrabold border ${
                                isSelected 
                                  ? 'bg-tomato-500 border-tomato-500 text-white' 
                                  : 'bg-gray-50 border-gray-200 text-gray-500'
                              }`}>
                                {opt.key}
                              </span>
                              <span className="text-xs">{opt.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {!isBlocked && questions.length > 0 && (
                <button 
                  onClick={() => handleSubmitExam(false)}
                  className="tomato-btn w-full py-3.5 text-sm flex items-center justify-center gap-2"
                >
                  <CheckSquare size={18} />
                  <span>Submit Exam Assessment</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Webcam, Demerits, and AI YOLOv8 Simulator */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Live webcam component */}
          <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-sm flex flex-col items-center">
            <h4 className="font-bold text-[10px] uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5 self-start">
              <Camera size={14} className="text-tomato-500" />
              <span>Camera Monitor Preview</span>
            </h4>
            <div className="w-full aspect-[4/3] bg-dark-900 rounded-xl overflow-hidden border border-gray-200 relative flex items-center justify-center">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} width="320" height="240" style={{ display: 'none' }} />
              {!streamRef.current && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  <div className="w-10 h-10 rounded-full bg-tomato-50 text-tomato-500 flex items-center justify-center mb-2 animate-bounce">
                    <ShieldAlert size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400">Webcam Inactive / Denied</span>
                </div>
              )}
            </div>
          </div>

          {/* Demerit points status */}
          <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-sm">
            <h4 className="font-bold text-[10px] uppercase tracking-wider text-gray-400 mb-3">AI Integrity Score</h4>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-gray-500">Demerit Suspicion Points</span>
              <span className={`px-2 py-0.5 rounded text-xs font-extrabold ${
                demerits >= 4 ? 'bg-red-100 text-red-700' :
                demerits >= 2 ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-150 text-green-700'
              }`}>
                {demerits} / 5
              </span>
            </div>
            {/* Demerit bar graph */}
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden flex">
              {[1, 2, 3, 4, 5].map(tick => (
                <div 
                  key={tick}
                  className={`flex-1 border-r border-white last:border-0 ${
                    demerits >= tick 
                      ? tick >= 4 ? 'bg-red-500' : tick >= 2 ? 'bg-yellow-500' : 'bg-green-500' 
                      : 'bg-gray-100'
                  }`}
                />
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-3 leading-normal">
              Accumulating 5 demerit points locks the exam panel for 5 minutes. Real-time copy & pasting checked.
            </p>
          </div>

          {/* YOLOv8 AI Model Simulator Panel */}
          <div className="bg-white border border-tomato-200 p-5 rounded-2xl shadow-md bg-gradient-to-b from-white to-tomato-50/15">
            <h4 className="font-bold text-[10px] uppercase tracking-wider text-tomato-600 mb-3 flex items-center gap-1.5">
              <Terminal size={14} />
              <span>YOLOv8 AI Simulator</span>
            </h4>
            <p className="text-[10px] text-gray-500 mb-4 leading-normal">
              Simulate video feed frame evaluation alerts from the YOLOv8 AI model for testing/demo.
            </p>
            <div className="space-y-2.5">
              <button
                onClick={() => logCheating('talking', 'YOLOv8 flagged student talking/whispering with another person.')}
                className="w-full bg-white hover:bg-tomato-500 hover:text-white border border-tomato-500/35 text-tomato-600 text-xs py-2 px-3 rounded-xl font-bold flex items-center justify-between smooth-transition shadow-sm active:scale-95"
              >
                <span>Simulate: Talking</span>
                <span className="text-[9px] font-mono opacity-80">+1 Pt</span>
              </button>
              <button
                onClick={() => logCheating('watching phone', 'YOLOv8 flagged student looking at mobile screen.')}
                className="w-full bg-white hover:bg-tomato-500 hover:text-white border border-tomato-500/35 text-tomato-600 text-xs py-2 px-3 rounded-xl font-bold flex items-center justify-between smooth-transition shadow-sm active:scale-95"
              >
                <span>Simulate: Mobile Watch</span>
                <span className="text-[9px] font-mono opacity-80">+2 Pts</span>
              </button>
              <button
                onClick={() => logCheating('taking photo', 'YOLOv8 flagged student taking photo of question paper.')}
                className="w-full bg-white hover:bg-tomato-500 hover:text-white border border-tomato-500/35 text-tomato-600 text-xs py-2 px-3 rounded-xl font-bold flex items-center justify-between smooth-transition shadow-sm active:scale-95"
              >
                <span>Simulate: Taking Photo</span>
                <span className="text-[9px] font-mono opacity-80">+2 Pts</span>
              </button>
            </div>

            {/* Simulated log output stream */}
            {showLogFeed.length > 0 && (
              <div className="mt-4 pt-3 border-t border-tomato-100">
                <span className="text-[9px] font-bold text-gray-400 block mb-1">Local Events:</span>
                <div className="font-mono text-[9px] bg-dark-900 text-tomato-300 p-2 rounded-lg leading-tight space-y-1">
                  {showLogFeed.map((f, idx) => (
                    <div key={idx} className="truncate">{f}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
