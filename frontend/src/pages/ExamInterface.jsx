import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api, { API_BASE_URL } from '../api/axiosConfig';
import { 
  Camera, ShieldAlert, AlertTriangle, Play, HelpCircle, 
  CheckSquare, ArrowLeft, Clock, ShieldCheck, Terminal
} from 'lucide-react';
import '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

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
  const canvasRef = useRef(null);
  const modelRef = useRef(null);
  const suspiciousTimersRef = useRef({});
  const isOutOfScreenRef = useRef(false);

  // Exam state
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0); // Seconds
  const [demerits, setDemerits] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeLeft, setBlockTimeLeft] = useState(0); // Block countdown seconds
  const [examStarted, setExamStarted] = useState(false);
  const [webcamReady, setWebcamReady] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [examDetails, setExamDetails] = useState(null);
  const [modelReady, setModelReady] = useState(false);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [limitReached, setLimitReached] = useState(false);
  const [showLogFeed, setShowLogFeed] = useState([]); // Local log stream on exam screen
  const [processedFrame, setProcessedFrame] = useState(null); // Annotated image from backend
  const [showRulesModal, setShowRulesModal] = useState(false);
  
  const tabHideTimeRef = useRef(null);
  const blurTimeRef = useRef(null);

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
        logCheating('Shortcut Activity', 'Student attempted Ctrl+C/V/X shortcut.', 1, false);
      }
    };

    // Detect Tab Switching
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabHideTimeRef.current = Date.now();
      } else {
        if (tabHideTimeRef.current) {
          const duration = Date.now() - tabHideTimeRef.current;
          if (duration > 10000) {
            logCheating('Tab Switching', `Tab hidden for ${Math.round(duration/1000)}s`, 0, true);
          } else {
            logCheating('Tab Switching', 'Student switched to another tab briefly.', 1, false);
          }
          tabHideTimeRef.current = null;
        }
      }
    };

    // Detect clicking outside the window
    const handleWindowBlur = () => {
      blurTimeRef.current = Date.now();
    };

    const handleWindowFocus = () => {
      if (blurTimeRef.current) {
        const duration = Date.now() - blurTimeRef.current;
        if (duration > 5000) {
          logCheating('Window Blur', `Window blurred for ${Math.round(duration/1000)}s`, 1, false);
        }
        blurTimeRef.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
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
      logCheating('Exit Attempt', 'Student tried to close or refresh the exam page early.', 0, true);
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

    const handleOffline = () => {
      // Auto submit if internet disconnects
      handleSubmitExam(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(timer);
      clearInterval(autoSaveTimer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
      window.removeEventListener('offline', handleOffline);
    };
  }, [examStarted, isBlocked, timeLeft, answers, examId]);

  // Handle 20+ demerit points auto-submit
  useEffect(() => {
    if (examStarted && demerits >= 20) {
      alert("You have reached 20 demerit points. Your exam is being automatically submitted.");
      handleSubmitExam(true);
    }
  }, [demerits, examStarted]);

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
      const activeExam = examsRes.data.find(e => String(e.id) === String(examId));
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

      setShowRulesModal(true);
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

  const startExamSession = () => {
    setShowRulesModal(false);
    setExamStarted(true);
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
      setWebcamReady(true);
    } catch (err) {
      console.warn('Webcam permission denied or unavailable:', err);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  // Load TFJS COCO-SSD Model
  useEffect(() => {
    const loadModel = async () => {
      try {
        const model = await cocoSsd.load();
        modelRef.current = model;
        setModelReady(true);
        console.log("Client-side TFJS Model loaded (Mocking YOLOv8)");
      } catch (err) {
        console.error("Error loading TFJS model", err);
      }
    };
    loadModel();
  }, []);

  // Client-side AI Detection Loop (Replacing WebSocket)
  useEffect(() => {
    if (!examStarted || !webcamReady || !examDetails || !modelReady) return;

    let frameInterval;
    
    // Start capturing after 5 seconds delay to let user settle
    const startDelay = setTimeout(() => {
      console.log('Started local AI Proctoring (Mock YOLOv8) Loop');
      
      // Frame capture and prediction loop (every 1.5s to save CPU)
      frameInterval = setInterval(async () => {
        if (modelRef.current && videoRef.current && videoRef.current.readyState === 4) {
          try {
            const predictions = await modelRef.current.detect(videoRef.current);
            
            // Draw on canvas to create processedFrame base64
            const canvas = canvasRef.current;
            if (canvas) {
              const ctx = canvas.getContext('2d');
              ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
              
              let detectedItems = new Set();

              predictions.forEach(prediction => {
                // Scale coordinates
                const [x, y, width, height] = prediction.bbox;
                const scaleX = canvas.width / videoRef.current.videoWidth;
                const scaleY = canvas.height / videoRef.current.videoHeight;
                
                // Only draw box if it's a relevant object or person
                if (['cell phone', 'book', 'laptop', 'person'].includes(prediction.class)) {
                  ctx.strokeStyle = '#ef4444'; // tomato/red
                  ctx.lineWidth = 2;
                  ctx.strokeRect(x * scaleX, y * scaleY, width * scaleX, height * scaleY);
                  ctx.fillStyle = '#ef4444';
                  ctx.font = '12px Arial';
                  ctx.fillText(`${prediction.class} (${Math.round(prediction.score*100)}%)`, x * scaleX, (y * scaleY) > 12 ? (y * scaleY) - 5 : 12);
                }

                if (['cell phone', 'book', 'laptop'].includes(prediction.class)) {
                  detectedItems.add(prediction.class);
                }
              });

              // Check for multiple people or no people
              const persons = predictions.filter(p => p.class === 'person');
              if (persons.length > 1) {
                detectedItems.add('multiple persons');
              } else if (persons.length === 0) {
                detectedItems.add('no person visible');
              }

              const now = Date.now();
              const timers = suspiciousTimersRef.current;
              let itemsToLog = [];

              // Check items and update timers (5 second rule)
              detectedItems.forEach(item => {
                if (!timers[item]) {
                  timers[item] = now; // Start tracking
                } else if (now - timers[item] > 5000) {
                  // Has been present for >5 seconds
                  if (item !== 'no person visible') {
                    if (item === 'cell phone') {
                      logCheating('AI Detection', 'Cell phone detected for > 5s', 0, true);
                    } else if (item === 'book' || item === 'laptop' || item === 'multiple persons') {
                      logCheating('AI Detection', `${item} detected for > 5s`, 2, false);
                    }
                    timers[item] = now; // Reset timer so it triggers again if held
                  }
                }
              });

              // Clear timers for items no longer detected
              Object.keys(timers).forEach(item => {
                if (item !== 'no person visible' && !detectedItems.has(item)) {
                  delete timers[item];
                }
              });

              // Special handling for out of screen returning
              if (detectedItems.has('no person visible')) {
                if (!timers['no person visible']) {
                  timers['no person visible'] = now;
                } else {
                  const outDuration = now - timers['no person visible'];
                  if (outDuration > 10000 && !isOutOfScreenRef.current) {
                    isOutOfScreenRef.current = true;
                    logCheating('AI Detection', 'Student left the screen for > 10s', 0, true);
                  } else if (outDuration > 5000 && !isOutOfScreenRef.current) {
                    isOutOfScreenRef.current = true;
                    // Optional: log "left screen" event locally
                  }
                }
              } else {
                if (isOutOfScreenRef.current) {
                  const outDuration = now - timers['no person visible'];
                  isOutOfScreenRef.current = false;
                  if (outDuration <= 10000) {
                    logCheating('AI Detection', 'Student back to screen (away <10s)', 1, false);
                  }
                  delete timers['no person visible'];
                } else {
                  delete timers['no person visible'];
                }
              }

              const base64Frame = canvas.toDataURL('image/jpeg', 0.6);
              setProcessedFrame(base64Frame);

              if (itemsToLog.length > 0) {
                // UI feed fallback
              }
            }
          } catch (err) {
            console.warn("Detection error", err);
          }
        }
      }, 1500); // 1.5 FPS
    }, 5000);

    return () => {
      clearTimeout(startDelay);
      if (frameInterval) clearInterval(frameInterval);
    };
  }, [examStarted, examDetails, webcamReady, modelReady]);

  // Log a cheating event (Actual copy/paste or Simulated YOLOv8)
  const logCheating = async (activityType, details, overrideDemerits = undefined, forceSubmit = false) => {
    // Add to local console feed
    const now = new Date().toLocaleTimeString();
    setShowLogFeed(prev => [`[${now}] Triggered: ${activityType} - ${details}`, ...prev.slice(0, 4)]);

    try {
      const res = await api.post('/proctor/log-incident', {
        examId: examId,
        studentId: user.id,
        studentName: user.name,
        activityType,
        details,
        overrideDemerits,
        forceSubmit
      });

      setDemerits(res.data.demerit_points);

      // Handle locking on the fly
      if (res.data.status === 'completed') {
        alert('A critical violation was detected! Your exam has been instantly auto-submitted.');
        navigate('/dashboard/student');
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
    logCheating('Clipboard Activity', 'Student attempted to use copy/cut/paste on the exam page', 1, false);
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
      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-dark-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative">
            <h2 className="text-2xl font-black text-dark-900 mb-4 border-b pb-4">Exam Rules & Proctoring Policies</h2>
            <div className="space-y-4 text-sm text-gray-700 max-h-[60vh] overflow-y-auto pr-4">
              <p className="font-semibold text-tomato-600 mb-2">Please read the following rules carefully before starting. Violations will add demerit points. Reaching 20 points will result in automatic submission.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><span className="font-bold">Copy/Paste/Cut (Shortcut):</span> 1 demerit point.</li>
                <li><span className="font-bold">Tab Switching / Minimize:</span> 1 demerit point. If away for >10s, auto-submit.</li>
                <li><span className="font-bold">Window Focus Lost (Blur):</span> 1 demerit point if blurred for >5s.</li>
                <li><span className="font-bold">Exit Attempt (Page Refresh/Close):</span> Auto-submit immediately.</li>
                <li><span className="font-bold">Network Disconnect (Offline):</span> Auto-submit immediately.</li>
                <li><span className="font-bold">Mobile Phone Detected (>5s):</span> Auto-submit immediately.</li>
                <li><span className="font-bold">Book Detected (>5s):</span> 2 demerit points.</li>
                <li><span className="font-bold">Laptop Detected (>5s):</span> 2 demerit points.</li>
                <li><span className="font-bold">Multiple Persons Detected (>5s):</span> 2 demerit points.</li>
                <li><span className="font-bold">Left Screen (>5s):</span> If away >10s, auto-submit.</li>
                <li><span className="font-bold">Returned to Screen (<10s):</span> 1 demerit point.</li>
              </ul>
            </div>
            <div className="mt-8 flex justify-end">
              <button 
                onClick={startExamSession}
                className="bg-tomato-500 hover:bg-tomato-600 text-white font-bold py-3 px-8 rounded-xl transition-colors text-lg"
              >
                I Understand, Start Exam
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
                demerits >= 15 ? 'bg-red-100 text-red-700' :
                demerits >= 10 ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-150 text-green-700'
              }`}>
                {demerits} / 20
              </span>
            </div>
            {/* Demerit bar graph */}
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden flex">
              {Array.from({ length: 20 }, (_, i) => i + 1).map(tick => (
                <div 
                  key={tick}
                  className={`flex-1 border-r border-white last:border-0 ${
                    demerits >= tick 
                      ? tick >= 15 ? 'bg-red-500' : tick >= 10 ? 'bg-yellow-500' : 'bg-green-500' 
                      : 'bg-gray-100'
                  }`}
                />
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-3 leading-normal">
              Reaching 20 points auto-submits the exam.
            </p>
          </div>


          {/* Live AI Detection Logs */}
          <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-sm">
            <h4 className="font-bold text-[10px] uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
              <Terminal size={14} className="text-tomato-500" />
              <span>YOLOv8 AI Log Feed</span>
            </h4>
            <div className="bg-dark-900 rounded-xl p-3 h-32 overflow-y-auto">
              {showLogFeed.length > 0 ? (
                <div className="font-mono text-[9px] text-tomato-300 space-y-1.5">
                  {showLogFeed.map((log, idx) => (
                    <div key={idx} className="truncate">{log}</div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-[10px] text-gray-600 font-mono italic">
                  No suspicious activity detected...
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
