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

  // Retrieve password from state, sessionStorage, or localStorage
  const password = location.state?.password || sessionStorage.getItem(`exam_pwd_${examId}`) || localStorage.getItem(`exam_pwd_${examId}`) || '';
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Webcam stream
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const modelRef = useRef(null);
  const suspiciousTimersRef = useRef({});
  const lastSeenRef = useRef({});
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
  const [liveDetections, setLiveDetections] = useState([]); // Current frame detections in real-time
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
          handleSubmitExam(true, 'Auto-Submitted: Time is up (Exam duration expired)'); // Auto-submit when time is up
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

    // [TEMPORARY DEV COMMENT-OUT]: Refresh auto-submit disabled during development.
    // REMEMBER TO RE-ENABLE BEFORE PRODUCTION!
    /*
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
    */

    return () => {
      clearInterval(timer);
      clearInterval(autoSaveTimer);
      /*
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
      window.removeEventListener('offline', handleOffline);
      */
    };
  }, [examStarted, isBlocked, timeLeft, answers, examId]);

  // Handle 20+ demerit points auto-submit
  useEffect(() => {
    if (examStarted && demerits >= 20) {
      alert("You have reached 20 demerit points. Your exam is being automatically submitted.");
      handleSubmitExam(true, 'Auto-Submitted: Exceeded 20 demerit points threshold');
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
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true });
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

  // Normalizes COCO-SSD class names so cell phones, notebook/books, and persons are accurately detected
  const normalizeDetectedClass = (rawClass) => {
    const cls = String(rawClass || '').toLowerCase().trim();
    if (cls === 'cell phone' || cls === 'remote' || cls === 'telephone' || cls === 'mobile') return 'cell phone';
    if (cls === 'book' || cls === 'notebook') return 'book';
    if (cls === 'person') return 'person';
    return null;
  };

  // Load TFJS COCO-SSD Model (Using mobilenet_v2 for significantly higher accuracy and small object detection)
  useEffect(() => {
    const loadModel = async () => {
      try {
        const model = await cocoSsd.load({ base: 'mobilenet_v2' });
        modelRef.current = model;
        setModelReady(true);
        console.log("Agent ELI - The Real-time AI Proctoring Engine loaded (mobilenet_v2)");
      } catch (err) {
        console.warn("Falling back to standard COCO-SSD model:", err);
        try {
          const fallbackModel = await cocoSsd.load();
          modelRef.current = fallbackModel;
          setModelReady(true);
          console.log("Agent ELI - Fallback COCO-SSD model loaded");
        } catch (fallbackErr) {
          console.error("Error loading TFJS model", fallbackErr);
        }
      }
    };
    loadModel();
  }, []);

  // Client-side AI Detection Loop
  useEffect(() => {
    if (!examStarted || !webcamReady || !examDetails || !modelReady) return;

    let frameInterval;
    
    // Start capturing after 3 seconds delay to let user settle
    const startDelay = setTimeout(() => {
      console.log('Started Agent ELI - The Real-time AI Proctoring Engine loop (1 FPS)');
      
      // Frame capture and prediction loop (1 FPS: every 1s / 1000ms)
      frameInterval = setInterval(async () => {
        if (modelRef.current && videoRef.current && videoRef.current.readyState === 4) {
          try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas) return;

            // Ensure canvas resolution matches video native stream 1:1 for pixel-perfect bounding boxes
            if (video.videoWidth && video.videoHeight) {
              if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
              }
            }

            // Detect objects (sensitivity threshold 0.18 for phones and notebooks)
            const predictions = await modelRef.current.detect(video, 30, 0.18);
            
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            let detectedItems = new Set();
            let liveDetectedList = [];

            predictions.forEach(prediction => {
              const mappedClass = normalizeDetectedClass(prediction.class);
              if (!mappedClass) return;

              // Dynamic confidence filtering: persons require >= 0.25; phones/notebooks >= 0.18
              if (mappedClass === 'person' && prediction.score < 0.25) return;
              if (mappedClass === 'cell phone' && prediction.score < 0.18) return;
              if (mappedClass === 'book' && prediction.score < 0.18) return;

              const [x, y, width, height] = prediction.bbox;
              const scorePercent = Math.round(prediction.score * 100);
              const isSuspicious = (mappedClass !== 'person');

              // Draw high-visibility bounding box
              ctx.strokeStyle = isSuspicious ? '#ef4444' : '#10b981';
              ctx.lineWidth = Math.max(3, Math.round(canvas.width / 400));
              ctx.strokeRect(x, y, width, height);

              // Draw clear pill badge with object name and score
              const displayTitle = mappedClass === 'cell phone' ? 'Cell Phone' :
                                   mappedClass === 'book' ? 'Notebook / Notes' : 'Person';
              const label = `${displayTitle} ${scorePercent}%`;
              ctx.font = 'bold 16px sans-serif';
              const textWidth = ctx.measureText(label).width;
              
              ctx.fillStyle = isSuspicious ? '#ef4444' : '#10b981';
              ctx.fillRect(x, Math.max(0, y - 26), textWidth + 14, 26);
              ctx.fillStyle = '#ffffff';
              ctx.fillText(label, x + 7, Math.max(18, y - 8));

              if (isSuspicious) {
                detectedItems.add(mappedClass);
                liveDetectedList.push(`${displayTitle} (${scorePercent}%)`);
              }
            });

            // Person verification
            const persons = predictions.filter(p => normalizeDetectedClass(p.class) === 'person' && p.score >= 0.25);
            if (persons.length > 1) {
              detectedItems.add('multiple persons');
              liveDetectedList.push(`Multiple Persons (${persons.length})`);
            } else if (persons.length === 0) {
              detectedItems.add('no person visible');
              liveDetectedList.push('No Person Visible');
            } else {
              if (liveDetectedList.length === 0) {
                liveDetectedList.push('1 Person Verified');
              }
            }

            setLiveDetections(liveDetectedList);

            const now = Date.now();
            const timers = suspiciousTimersRef.current;
            const lastSeen = lastSeenRef.current;

            // Track timers with grace period (doesn't wipe out on single frame drop)
            detectedItems.forEach(item => {
              lastSeen[item] = now;
              if (!timers[item]) {
                timers[item] = now; // Start tracking
              } else if (now - timers[item] >= 4000) {
                // Present for >4 seconds
                if (item !== 'no person visible') {
                  if (item === 'cell phone') {
                    logCheating('AI Detection', 'Cell phone detected in camera', 0, true);
                  } else if (item === 'book' || item === 'multiple persons') {
                    const itemName = item === 'book' ? 'Notebook / Notes' : item;
                    logCheating('AI Detection', `${itemName} detected in camera`, 2, false);
                  }
                  timers[item] = now; // Reset timer so it doesn't spam every second
                }
              }
            });

            // Clear timers only if item hasn't been seen for > 2.5 seconds (resilient to motion blur)
            Object.keys(timers).forEach(item => {
              if (item !== 'no person visible') {
                if (now - (lastSeen[item] || 0) > 2500) {
                  delete timers[item];
                }
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
                } else if (outDuration > 4000 && !isOutOfScreenRef.current) {
                  isOutOfScreenRef.current = true;
                }
              }
            } else {
              if (isOutOfScreenRef.current) {
                const outDuration = now - (timers['no person visible'] || now);
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
          } catch (err) {
            console.warn("Detection error", err);
          }
        }
      }, 1000); // 1 FPS (1000ms)
    }, 3000);

    return () => {
      clearTimeout(startDelay);
      if (frameInterval) clearInterval(frameInterval);
    };
  }, [examStarted, examDetails, webcamReady, modelReady]);

  // Log a cheating event (Actual copy/paste or Agent ELI detection)
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
  const handleSubmitExam = async (isAuto = false, reason = null) => {
    try {
      const submissionReason = reason || (isAuto ? 'Auto-Submitted: Exam time expired' : 'Exam submitted manually by student');
      const res = await api.post(`/student/exams/${examId}/submit`, { 
        answers,
        reason: submissionReason,
        isAuto
      });
      alert(isAuto ? `Exam auto-submitted: ${submissionReason}` : 'Exam submitted successfully.');
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
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border-t-4 border-red-500 animate-scale-up flex flex-col items-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <ShieldAlert size={40} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Maximum Attempts Reached</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            You have already reached the maximum number of allowed attempts for this exam. You cannot take this exam again.
          </p>
          <button 
            onClick={() => window.close()} 
            className="w-full bg-gray-100 hover:bg-dark-600 text-gray-900 font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-white flex flex-col font-sans"
      onCopy={handleClipboard}
      onCut={handleClipboard}
      onPaste={handleClipboard}
    >
      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative">
            <h2 className="text-2xl font-black text-gray-900 mb-4 border-b pb-4">Exam Rules & Proctoring Policies</h2>
            <div className="space-y-4 text-sm text-gray-700 max-h-[60vh] overflow-y-auto pr-4">
              <p className="font-semibold text-tomato-600 mb-2">Please read the following rules carefully before starting. Violations will add demerit points. Reaching 20 points will result in automatic submission.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><span className="font-bold">Copy/Paste/Cut (Shortcut):</span> 1 demerit point.</li>
                <li><span className="font-bold">Tab Switching / Minimize:</span> 1 demerit point. If away for &gt;10s, auto-submit.</li>
                <li><span className="font-bold">Window Focus Lost (Blur):</span> 1 demerit point if blurred for &gt;5s.</li>
                <li><span className="font-bold">Exit Attempt (Page Refresh/Close):</span> Auto-submit immediately.</li>
                <li><span className="font-bold">Network Disconnect (Offline):</span> Auto-submit immediately.</li>
                <li><span className="font-bold">Mobile Phone Detected (&gt;5s):</span> Auto-submit immediately.</li>
                <li><span className="font-bold">Notebook / Book Detected (&gt;5s):</span> 2 demerit points.</li>
                <li><span className="font-bold">Multiple Persons Detected (&gt;5s):</span> 2 demerit points.</li>
                <li><span className="font-bold">Left Screen (&gt;5s):</span> If away &gt;10s, auto-submit.</li>
                <li><span className="font-bold">Returned to Screen (&lt;10s):</span> 1 demerit point.</li>
              </ul>
            </div>
            <div className="mt-8 flex justify-end">
              <button 
                onClick={startExamSession}
                className="bg-gray-900 hover:bg-black shadow-md hover:shadow-lg shadow-tomato-500/10 hover:shadow-tomato-500/30 transition-all text-white font-bold py-3 px-8 rounded-xl transition-colors text-lg"
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
          <div className="bg-white border border-gray-200 p-6 rounded-2xl flex justify-between items-center shadow-md shadow-gray-200/50">
            <div>
              <button 
                onClick={() => { if(window.confirm('Abandon exam? Your progress will not be submitted.')) navigate('/dashboard/student'); }} 
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-tomato-400 mb-2 smooth-transition"
              >
                <ArrowLeft size={13} />
                <span>Exit Exam Portal</span>
              </button>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">{examTitle || 'Loading Exam...'}</h2>
              <p className="text-xs text-gray-500 mt-1">Answer all multiple choice questions. Copy/paste checks are active.</p>
            </div>

            {/* Timer widget */}
            <div className="flex items-center gap-3 bg-tomato-50 text-tomato-650 py-2.5 px-4 rounded-xl border border-tomato-100 font-semibold shadow-md shadow-gray-200/50">
              <Clock size={18} className="animate-pulse" />
              <div className="text-left font-mono">
                <span className="text-[10px] block uppercase text-tomato-400 font-bold leading-3">Time Left</span>
                <span className="text-lg font-bold">{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-gray-200/50 animate-fade-in">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Questions Render */}
          {questions.length === 0 && !loading && !isBlocked ? (
            <div className="bg-white border border-gray-200 py-16 text-center text-xs text-gray-500 rounded-2xl shadow-md shadow-gray-200/50">
              Exam questions are not configured or are locked. Please contact your instructor.
            </div>
          ) : (
            <div className="space-y-6">
              {questions.map((q, idx) => (
                <div key={q.id} className="bg-white border border-gray-200 p-6 rounded-2xl shadow-md shadow-gray-200/50">
                  <h4 className="font-bold text-gray-900 text-sm mb-4 leading-relaxed">
                    Question {idx + 1}: {q.question_text}
                  </h4>
                  <div className="mt-4">
                    {(q.type === 'Written' || String(q.type || q.question_type || '').toLowerCase() === 'written' || String(q.type || q.question_type || '').toLowerCase() === 'descriptive') ? (
                      <textarea
                        value={answers[q.id] || ''}
                        onChange={(e) => handleOptionChange(q.id, e.target.value)}
                        placeholder="Type your answer here..."
                        className="w-full h-32 p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-800 text-sm resize-none"
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
                                  ? 'border-gray-800 bg-tomato-50/15 font-semibold text-tomato-800' 
                                  : 'border-gray-100 hover:border-tomato-200 hover:bg-white text-gray-650'
                              }`}
                            >
                              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-extrabold border ${
                                isSelected 
                                  ? 'bg-gray-900 border-gray-800 text-white' 
                                  : 'bg-white border-gray-200 text-gray-500'
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
                  onClick={() => handleSubmitExam(false, 'Exam submitted manually by student')}
                  className="tomato-btn w-full py-3.5 text-sm flex items-center justify-center gap-2"
                >
                  <CheckSquare size={18} />
                  <span>Submit Exam Assessment</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Webcam, Demerits, and Agent ELI Proctoring */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Live webcam component */}
          <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-md shadow-gray-200/50 flex flex-col items-center">
            <h4 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5 self-start">
              <Camera size={14} className="text-tomato-400" />
              <span>Camera Monitor Preview</span>
            </h4>
            <div className="w-full aspect-[4/3] bg-white rounded-xl overflow-hidden border border-gray-200 relative flex items-center justify-center">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />

              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10" />
              {!streamRef.current && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  <div className="w-10 h-10 rounded-full bg-tomato-50 text-tomato-400 flex items-center justify-center mb-2 animate-bounce">
                    <ShieldAlert size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500">Webcam Inactive / Denied</span>
                </div>
              )}
            </div>

            {/* Live AI Status Pill */}
            <div className="w-full mt-3 flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[10px]">
              <span className="font-bold text-gray-700 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  liveDetections.some(d => d.includes('Cell Phone') || d.includes('Book') || d.includes('Multiple') || d.includes('Screen'))
                    ? 'bg-red-500 animate-ping'
                    : 'bg-green-500'
                }`} />
                AI Vision Live:
              </span>
              <span className={`font-mono font-bold truncate max-w-[200px] ${
                liveDetections.some(d => d.includes('Cell Phone') || d.includes('Book') || d.includes('Multiple') || d.includes('Screen'))
                  ? 'text-red-600'
                  : 'text-gray-800'
              }`}>
                {liveDetections.length > 0 ? liveDetections.join(', ') : 'Initializing AI...'}
              </span>
            </div>
          </div>

          {/* Demerit points status */}
          <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-md shadow-gray-200/50">
            <h4 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-3">AI Integrity Score</h4>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-gray-500">Demerit Suspicion Points</span>
              <span className={`px-2 py-0.5 rounded text-xs font-extrabold ${
                demerits >= 15 ? 'bg-red-100 text-red-700' :
                demerits >= 10 ? 'bg-yellow-100 text-yellow-700' :
                'bg-tomato-150 text-tomato-700'
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
                      ? tick >= 15 ? 'bg-red-500' : tick >= 10 ? 'bg-yellow-500' : 'bg-gray-900' 
                      : 'bg-gray-100'
                  }`}
                />
              ))}
            </div>
            <p className="text-[10px] text-gray-500 mt-3 leading-normal">
              Reaching 20 points auto-submits the exam.
            </p>
          </div>


          {/* Live AI Detection Logs */}
          <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-md shadow-gray-200/50">
            <h4 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
              <Terminal size={14} className="text-tomato-400" />
              <span>Agent ELI - The Real-time AI Proctoring Engine</span>
            </h4>
            <div className="bg-white rounded-xl p-3 h-32 overflow-y-auto">
              {showLogFeed.length > 0 ? (
                <div className="font-mono text-[9px] text-tomato-300 space-y-1.5">
                  {showLogFeed.map((log, idx) => (
                    <div key={idx} className="truncate">{log}</div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-[10px] text-gray-500 font-mono italic">
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
