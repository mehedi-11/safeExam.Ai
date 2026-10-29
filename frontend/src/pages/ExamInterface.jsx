import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api, { API_BASE_URL } from '../api/axiosConfig';
import { 
  Camera, ShieldAlert, AlertTriangle, Play, HelpCircle, 
  CheckSquare, ArrowLeft, Clock, ShieldCheck, Terminal,
  Smartphone, EyeOff, CheckCircle, X, WifiOff, Wifi, RefreshCw
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
  const [webcamLoading, setWebcamLoading] = useState(false);
  const [webcamError, setWebcamError] = useState(null);
  const [examTitle, setExamTitle] = useState('');
  const [examDetails, setExamDetails] = useState(null);
  const [modelReady, setModelReady] = useState(false);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [limitReached, setLimitReached] = useState(false);
  const [showLogFeed, setShowLogFeed] = useState([]); // Local log stream on exam screen
  const [liveDetections, setLiveDetections] = useState([]); // Current frame detections in real-time
  const [processedFrame, setProcessedFrame] = useState(null); // Annotated image from backend
  const [showRulesModal, setShowRulesModal] = useState(false);
  
  // Warning Modals & Countdown States
  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const hasWarnedShortcutRef = useRef(false);

  const [showTabSwitchModal, setShowTabSwitchModal] = useState(false);
  const [tabCountdown, setTabCountdown] = useState(5);
  const tabCountdownIntervalRef = useRef(null);
  const tabWarningTriggeredRef = useRef(false);

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneCountdown, setPhoneCountdown] = useState(5);
  const phoneCountdownIntervalRef = useRef(null);
  const phoneWarningActiveRef = useRef(false);

  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [absenceCountdown, setAbsenceCountdown] = useState(5);
  const absenceCountdownIntervalRef = useRef(null);
  const absenceWarningActiveRef = useRef(false);

  const [showDemeritModal, setShowDemeritModal] = useState(false);
  const hasSubmittedRef = useRef(false);
  const bookTicksRef = useRef(0);
  
  // Network Offline / Hold States (5-minute countdown)
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineCountdown, setOfflineCountdown] = useState(300); // 5 minutes = 300 seconds
  const offlineCountdownIntervalRef = useRef(null);
  const offlineStartTimeRef = useRef(null);

  const tabHideTimeRef = useRef(null);
  const blurTimeRef = useRef(null);

  // API setup centralized in axiosConfig
  // 1. Initial Exam Check & Webcam access + Reload Check
  useEffect(() => {
    if (!token) {
      navigate('/login/student');
      return;
    }

    // Condition 1: Check if browser reload happened during active exam session
    const wasActive = sessionStorage.getItem(`exam_active_${examId}`) === 'true';
    const navEntries = performance.getEntriesByType('navigation');
    const isReload = navEntries.length > 0 && navEntries[0].type === 'reload';

    if (wasActive && isReload) {
      sessionStorage.removeItem(`exam_active_${examId}`);
      api.post(`/student/exams/${examId}/submit`, {
        answers: {},
        reason: 'Auto-Submitted: Student reloaded the exam browser page',
        isAuto: true
      }).finally(() => {
        customAlert('Browser reload detected! Your exam has been auto-submitted as per rules.', 'Exam Terminated', 'error');
        navigate('/dashboard/student');
      });
      return;
    }

    initExam();
    startWebcam();

    const handleBeforeUnload = () => {
      stopWebcam();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      stopWebcam();
    };
  }, [examId]);

  const lastShortcutLogRef = useRef(0);

  // Trigger prohibited shortcut or mouse action (1st time warning modal, 2nd time onwards 1 demerit)
  const triggerShortcutAction = (actionName) => {
    const now = Date.now();
    if (now - lastShortcutLogRef.current < 700) return;
    lastShortcutLogRef.current = now;

    if (!hasWarnedShortcutRef.current) {
      hasWarnedShortcutRef.current = true;
      setShowShortcutModal(true);
    } else {
      logCheating('Shortcut Activity', `Student attempted prohibited action (${actionName})`, 1, false);
    }
  };

  // Trigger Tab / Window Blur auto-submit countdown modal
  const triggerTabAutoSubmitCountdown = () => {
    if (tabWarningTriggeredRef.current || hasSubmittedRef.current) return;
    tabWarningTriggeredRef.current = true;
    setShowTabSwitchModal(true);
    setTabCountdown(5);

    if (tabCountdownIntervalRef.current) clearInterval(tabCountdownIntervalRef.current);
    let count = 5;
    tabCountdownIntervalRef.current = setInterval(() => {
      count -= 1;
      setTabCountdown(count);
      if (count <= 0) {
        clearInterval(tabCountdownIntervalRef.current);
        handleSubmitExam(true, 'Auto-Submitted: Left exam page or switched tabs for more than 10 seconds');
      }
    }, 1000);
  };

  const handleDismissTabModal = () => {
    if (tabCountdownIntervalRef.current) clearInterval(tabCountdownIntervalRef.current);
    setShowTabSwitchModal(false);
    handleSubmitExam(true, 'Auto-Submitted: Closed tab switch warning modal');
  };

  const handleDismissAbsenceModal = () => {
    if (absenceCountdownIntervalRef.current) clearInterval(absenceCountdownIntervalRef.current);
    setShowAbsenceModal(false);
    handleSubmitExam(true, 'Auto-Submitted: Closed absence warning modal');
  };

  // 2. Client-side cheating triggers (Copy/Paste hooks, Focus tracking, Shortcuts)
  useEffect(() => {
    if (!examStarted || isBlocked) return;

    // Detect prohibited shortcuts (Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A) and Reload (F5, Ctrl+R)
    const handleKeyDown = (e) => {
      // Condition 1: Block F5 or Ctrl/Cmd + R and auto-submit
      if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r')) {
        e.preventDefault();
        handleSubmitExam(true, 'Auto-Submitted: Student pressed reload key (F5/Ctrl+R)');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        triggerShortcutAction(`${e.ctrlKey ? 'Ctrl' : 'Cmd'}+${e.key.toUpperCase()}`);
      }
    };

    // Detect mouse copy/cut/paste/contextmenu/selectstart
    const handleMouseBlock = (e) => {
      e.preventDefault();
      triggerShortcutAction(`Mouse ${e.type}`);
    };

    // Detect Tab Switching
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabHideTimeRef.current = Date.now();
        logCheating('Tab Switching', 'Student switched to another tab', 2, false);
      } else {
        if (tabHideTimeRef.current) {
          const duration = Date.now() - tabHideTimeRef.current;
          if (duration >= 10000) {
            triggerTabAutoSubmitCountdown();
          }
          tabHideTimeRef.current = null;
        }
      }
    };

    // Detect clicking outside the window
    const handleWindowBlur = () => {
      blurTimeRef.current = Date.now();
      logCheating('Window Blur', 'Student clicked outside or lost window focus', 2, false);
    };

    const handleWindowFocus = () => {
      if (blurTimeRef.current) {
        const duration = Date.now() - blurTimeRef.current;
        if (duration >= 10000) {
          triggerTabAutoSubmitCountdown();
        }
        blurTimeRef.current = null;
      }
    };

    // Constant 1s checker if student remains away for >= 10s
    const awayMonitorTimer = setInterval(() => {
      const now = Date.now();
      if (tabHideTimeRef.current && (now - tabHideTimeRef.current >= 10000)) {
        triggerTabAutoSubmitCountdown();
      }
      if (blurTimeRef.current && (now - blurTimeRef.current >= 10000)) {
        triggerTabAutoSubmitCountdown();
      }
    }, 1000);

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('contextmenu', handleMouseBlock);
    document.addEventListener('copy', handleMouseBlock);
    document.addEventListener('cut', handleMouseBlock);
    document.addEventListener('paste', handleMouseBlock);
    document.addEventListener('selectstart', handleMouseBlock);

    return () => {
      clearInterval(awayMonitorTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('contextmenu', handleMouseBlock);
      document.removeEventListener('copy', handleMouseBlock);
      document.removeEventListener('cut', handleMouseBlock);
      document.removeEventListener('paste', handleMouseBlock);
      document.removeEventListener('selectstart', handleMouseBlock);
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

    // 6. Detect page close/refresh (Condition 1)
    const handleBeforeUnload = (e) => {
      if (examStarted && !hasSubmittedRef.current) {
        e.preventDefault();
        e.returnValue = '';
        const payload = JSON.stringify({
          answers,
          reason: 'Auto-Submitted: Student refreshed or closed the exam page',
          isAuto: true
        });
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(`${API_BASE_URL}/api/student/exams/${examId}/submit`, blob);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(timer);
      clearInterval(autoSaveTimer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [examStarted, isBlocked, timeLeft, answers, examId]);

  // Condition 2: Network Offline Tracking, Exam Hold & 5-Minute Auto-Submit
  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      offlineStartTimeRef.current = Date.now();
      setOfflineCountdown(300); // 5 minutes

      if (offlineCountdownIntervalRef.current) clearInterval(offlineCountdownIntervalRef.current);
      let count = 300;
      offlineCountdownIntervalRef.current = setInterval(() => {
        count -= 1;
        setOfflineCountdown(count);
        if (count <= 0) {
          clearInterval(offlineCountdownIntervalRef.current);
          handleSubmitExam(true, 'Auto-Submitted: Network disconnected for more than 5 minutes');
        }
      }, 1000);
    };

    const handleOnline = () => {
      if (offlineCountdownIntervalRef.current) clearInterval(offlineCountdownIntervalRef.current);
      const offlineSec = Math.round((Date.now() - (offlineStartTimeRef.current || Date.now())) / 1000);
      setIsOffline(false);
      if (examStarted && !hasSubmittedRef.current) {
        logCheating('Network Restored', `Student reconnected after ${offlineSec}s offline`, 0, false);
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      if (offlineCountdownIntervalRef.current) clearInterval(offlineCountdownIntervalRef.current);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [examStarted]);

  // Periodic Heartbeat every 10 seconds to inform backend that student is online
  useEffect(() => {
    if (!examStarted || isBlocked || isOffline) return;

    const heartbeatTimer = setInterval(() => {
      if (navigator.onLine) {
        api.post(`/student/exams/${examId}/heartbeat`).catch(() => {});
      }
    }, 10000);

    return () => clearInterval(heartbeatTimer);
  }, [examStarted, isBlocked, isOffline, examId]);

  // Handle 10+ demerit points auto-submit
  useEffect(() => {
    if (examStarted && demerits >= 10 && !hasSubmittedRef.current) {
      setShowDemeritModal(true);
      const timer = setTimeout(() => {
        handleSubmitExam(true, 'Auto-Submitted: Exceeded 10 demerit points threshold');
      }, 3500);
      return () => clearTimeout(timer);
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

  const startExamSession = async () => {
    if (!webcamReady) {
      await startWebcam();
    }
    sessionStorage.setItem(`exam_active_${examId}`, 'true');
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

  const stopWebcam = () => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      } catch (e) {
        console.warn('Error stopping tracks:', e);
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setWebcamReady(false);
  };

  const startWebcam = async () => {
    setWebcamLoading(true);
    setWebcamError(null);
    stopWebcam(); // Always release previous stream first

    try {
      let mediaStream = null;
      // 1. Try ideal video & audio
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        });
      } catch (e1) {
        console.warn('Ideal video+audio failed, trying standard video+audio:', e1);
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (e2) {
          console.warn('Standard audio+video failed, trying video only:', e2);
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }

      if (mediaStream) {
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.warn('Video play error:', e));
          };
        }
        setWebcamReady(true);
        setWebcamError(null);
      } else {
        throw new Error('Could not acquire media stream');
      }
    } catch (err) {
      console.warn('Webcam permission denied or unavailable:', err);
      setWebcamReady(false);
      setWebcamError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera and microphone in your browser settings.'
          : (err.message || 'Camera or microphone is currently in use or unavailable.')
      );
    } finally {
      setWebcamLoading(false);
    }
  };

  // Ensure video element receives stream when ready or when modal state changes
  useEffect(() => {
    if (webcamReady && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.warn('Video play error:', e));
        };
      }
    }
  }, [webcamReady, showRulesModal]);

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
              } else {
                const elapsed = now - timers[item];

                // Rule 3: Mobile phone detected for >= 5s -> show warning modal with 5s countdown
                if (item === 'cell phone') {
                  if (elapsed >= 5000 && !phoneWarningActiveRef.current) {
                    triggerPhoneWarningModal();
                  }
                } 
                // Rule 5: Book / Notebook detected -> 1 demerit point for every 5s
                else if (item === 'book') {
                  const currentTicks = Math.floor(elapsed / 5000);
                  const prevTicks = bookTicksRef.current || 0;
                  if (currentTicks > prevTicks) {
                    bookTicksRef.current = currentTicks;
                    logCheating('AI Detection', `Notebook / Notes detected in camera (${currentTicks * 5}s)`, 1, false);
                  }
                } 
                // Multiple persons detected -> 2 points every 5s
                else if (item === 'multiple persons') {
                  if (elapsed >= 4000 && (!timers['mp_logged'] || now - timers['mp_logged'] >= 5000)) {
                    timers['mp_logged'] = now;
                    logCheating('AI Detection', 'Multiple persons detected in camera', 2, false);
                  }
                }
              }
            });

            // Clear timers only if item hasn't been seen for > 2.5 seconds (resilient to motion blur)
            Object.keys(timers).forEach(item => {
              if (item !== 'no person visible' && item !== 'mp_logged') {
                if (now - (lastSeen[item] || 0) > 2500) {
                  delete timers[item];
                  if (item === 'book') bookTicksRef.current = 0;
                }
              }
            });

            // Rule 4: Out of screen / person absent for >= 10s -> trigger absence auto-submit modal
            if (detectedItems.has('no person visible')) {
              if (!timers['no person visible']) {
                timers['no person visible'] = now;
              } else {
                const outDuration = now - timers['no person visible'];
                if (outDuration >= 10000 && !absenceWarningActiveRef.current) {
                  triggerAbsenceAutoSubmitModal();
                }
              }
            } else {
              delete timers['no person visible'];
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

  // Trigger Phone Warning Modal with 5s countdown
  const triggerPhoneWarningModal = () => {
    if (phoneWarningActiveRef.current || hasSubmittedRef.current) return;
    phoneWarningActiveRef.current = true;
    setShowPhoneModal(true);
    setPhoneCountdown(5);

    logCheating('AI Detection', 'Cell phone detected in camera (Warning issued)', 0, false);

    if (phoneCountdownIntervalRef.current) clearInterval(phoneCountdownIntervalRef.current);
    let count = 5;
    phoneCountdownIntervalRef.current = setInterval(() => {
      count -= 1;
      setPhoneCountdown(count);
      if (count <= 0) {
        clearInterval(phoneCountdownIntervalRef.current);
        handleSubmitExam(true, 'Auto-Submitted: Mobile phone detected and warning not confirmed within 5s');
      }
    }, 1000);
  };

  const handleConfirmPhoneRemoved = () => {
    if (phoneCountdownIntervalRef.current) clearInterval(phoneCountdownIntervalRef.current);
    setShowPhoneModal(false);
    phoneWarningActiveRef.current = false;
    if (suspiciousTimersRef.current) {
      delete suspiciousTimersRef.current['cell phone'];
    }
  };

  // Trigger Absence Warning Modal with 5s countdown
  const triggerAbsenceAutoSubmitModal = () => {
    if (absenceWarningActiveRef.current || hasSubmittedRef.current) return;
    absenceWarningActiveRef.current = true;
    setShowAbsenceModal(true);
    setAbsenceCountdown(5);

    logCheating('AI Detection', 'Student absent from camera screen for > 10s', 0, false);

    if (absenceCountdownIntervalRef.current) clearInterval(absenceCountdownIntervalRef.current);
    let count = 5;
    absenceCountdownIntervalRef.current = setInterval(() => {
      count -= 1;
      setAbsenceCountdown(count);
      if (count <= 0) {
        clearInterval(absenceCountdownIntervalRef.current);
        handleSubmitExam(true, 'Auto-Submitted: Left camera view for more than 10 seconds');
      }
    }, 1000);
  };

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
      if (res.data.status === 'completed' && !hasSubmittedRef.current) {
        stopWebcam();
        customAlert('A critical violation was detected! Your exam has been auto-submitted.', 'Critical Violation', 'error');
        navigate('/dashboard/student');
      }
    } catch (err) {
      console.error('Error reporting proctor alert:', err);
    }
  };

  // Submit Exam
  const handleSubmitExam = async (isAuto = false, reason = null) => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setIsSubmitting(true);
    stopWebcam(); // Release camera and microphone hardware tracks immediately
    sessionStorage.removeItem(`exam_active_${examId}`);
    const submissionReason = reason || (isAuto ? 'Auto-Submitted: Exam time expired' : 'Exam submitted manually by student');

    try {
      await api.post(`/student/exams/${examId}/submit`, { 
        answers,
        reason: submissionReason,
        isAuto
      });
      customAlert(isAuto ? `Exam auto-submitted: ${submissionReason}` : 'Exam submitted successfully.', isAuto ? 'Exam Finalized' : 'Exam Submitted', isAuto ? 'warning' : 'success');
      navigate('/dashboard/student');
    } catch (err) {
      customAlert(isAuto ? `Exam auto-submitted: ${submissionReason}` : 'Exam submitted: ' + (err.response?.data?.message || 'Done'), isAuto ? 'Exam Finalized' : 'Exam Submitted', isAuto ? 'warning' : 'success');
      navigate('/dashboard/student');
    }
  };

  const handleOptionChange = (questionId, option) => {
    setAnswers({ ...answers, [questionId]: option });
  };

  const handleClipboard = (e) => {
    e.preventDefault();
    triggerShortcutAction(`Mouse ${e.type}`);
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
      className={`min-h-screen bg-white flex flex-col font-sans select-none ${isOffline ? 'pointer-events-none' : ''}`}
      onCopy={handleClipboard}
      onCut={handleClipboard}
      onPaste={handleClipboard}
      onContextMenu={handleClipboard}
    >
      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative">
            <h2 className="text-2xl font-black text-gray-900 mb-4 border-b pb-4">Exam Rules & Proctoring Policies</h2>
            <div className="space-y-4 text-sm text-gray-700 max-h-[60vh] overflow-y-auto pr-4">
              <p className="font-semibold text-tomato-600 mb-2">Please read the following rules carefully before starting. Violations will add demerit points. Reaching 10 points will result in automatic submission.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><span className="font-bold">Copy/Paste/Cut/Select (Shortcut/Mouse):</span> 1st attempt shows warning; 2nd attempt onwards adds 1 demerit point.</li>
                <li><span className="font-bold">Tab Switching / Window Focus Lost:</span> 2 demerit points. If away for &gt;10s, 5s countdown auto-submit modal triggers.</li>
                <li><span className="font-bold">Browser Reload / Refresh:</span> Reloading or refreshing the page will immediately auto-submit your exam.</li>
                <li><span className="font-bold">Network Disconnection:</span> Exam is placed on hold (no answering allowed) until connection returns. If offline for &gt;5 minutes, exam auto-submits.</li>
                <li><span className="font-bold">Mobile Phone Detected (&gt;5s):</span> Warning modal with 5s countdown triggers to confirm removal.</li>
                <li><span className="font-bold">Notebook / Book Detected:</span> 1 demerit point added for every 5 seconds visible.</li>
                <li><span className="font-bold">Multiple Persons Detected (&gt;4s):</span> 2 demerit points.</li>
                <li><span className="font-bold">Left Screen / Absence (&gt;10s):</span> Warning modal with 5s countdown to auto-submit.</li>
                <li><span className="font-bold">Accumulated 10 Demerits:</span> Immediate auto-submission of the exam.</li>
              </ul>
            </div>

            {/* Camera & Mic Pre-flight Check */}
            <div className="mt-6 p-4 rounded-2xl border border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  webcamReady ? 'bg-green-100 text-green-700' : 'bg-tomato-100 text-tomato-700'
                }`}>
                  <Camera size={20} />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-gray-900">
                    {webcamReady ? 'Camera & Audio Active' : 'Camera & Audio Permission Required'}
                  </h5>
                  <p className="text-[11px] text-gray-500">
                    {webcamReady
                      ? 'Live video stream ready. AI proctoring will monitor your exam.'
                      : (webcamError || 'Please allow camera and microphone access to begin the exam.')}
                  </p>
                </div>
              </div>

              {!webcamReady ? (
                <button
                  type="button"
                  onClick={startWebcam}
                  disabled={webcamLoading}
                  className="px-4 py-2 bg-tomato-500 hover:bg-tomato-600 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw size={13} className={webcamLoading ? 'animate-spin' : ''} />
                  <span>{webcamLoading ? 'Connecting...' : 'Allow / Test Camera'}</span>
                </button>
              ) : (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg flex items-center gap-1 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Verified
                </span>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={startExamSession}
                className="bg-gray-900 hover:bg-black shadow-md hover:shadow-lg shadow-tomato-500/10 hover:shadow-tomato-500/30 transition-all text-white font-bold py-3 px-8 rounded-xl transition-colors text-lg cursor-pointer"
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
                onClick={async () => { 
                  const confirmed = await customConfirm('Abandon exam? Your progress will not be submitted.', { title: 'Abandon Exam', confirmText: 'Abandon', type: 'danger' }); if (confirmed) {
                    stopWebcam();
                    navigate('/dashboard/student');
                  }
                }} 
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
                  disabled={isSubmitting}
                  className="tomato-btn w-full py-3.5 text-sm flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <RefreshCw className="animate-spin shrink-0" size={18} />
                  ) : (
                    <CheckSquare size={18} />
                  )}
                  <span>{isSubmitting ? 'Submitting Assessment...' : 'Submit Exam Assessment'}</span>
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
            <div className="w-full aspect-[4/3] bg-gray-900 rounded-xl overflow-hidden border border-gray-200 relative flex items-center justify-center">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${webcamReady ? 'block' : 'hidden'}`}
              />

              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10" />
              {!webcamReady && (
                <div className="absolute inset-0 bg-gray-900/95 flex flex-col items-center justify-center text-center p-4">
                  <div className="w-10 h-10 rounded-full bg-tomato-500/20 text-tomato-400 flex items-center justify-center mb-2">
                    <ShieldAlert size={20} />
                  </div>
                  <span className="text-xs font-bold text-white mb-1">
                    {webcamLoading ? 'Starting Camera...' : 'Camera Inactive / Denied'}
                  </span>
                  <p className="text-[10px] text-gray-300 max-w-[200px] mb-3 leading-tight">
                    {webcamError || 'Camera permission was declined or device is busy.'}
                  </p>
                  <button
                    onClick={startWebcam}
                    disabled={webcamLoading}
                    className="px-3 py-1.5 bg-tomato-500 hover:bg-tomato-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw size={12} className={webcamLoading ? 'animate-spin' : ''} />
                    <span>{webcamLoading ? 'Connecting...' : 'Restart Camera'}</span>
                  </button>
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
                demerits >= 8 ? 'bg-red-100 text-red-700' :
                demerits >= 5 ? 'bg-yellow-100 text-yellow-700' :
                'bg-tomato-150 text-tomato-700'
              }`}>
                {demerits} / 10
              </span>
            </div>
            {/* Demerit bar graph */}
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden flex">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(tick => (
                <div 
                  key={tick}
                  className={`flex-1 border-r border-white last:border-0 ${
                    demerits >= tick 
                      ? tick >= 8 ? 'bg-red-500' : tick >= 5 ? 'bg-yellow-500' : 'bg-gray-900' 
                      : 'bg-gray-100'
                  }`}
                />
              ))}
            </div>
            <p className="text-[10px] text-gray-500 mt-3 leading-normal">
              Reaching 10 points auto-submits the exam.
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

      {/* 1. Prohibited Shortcut / Mouse Action Warning Modal */}
      {showShortcutModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-t-4 border-amber-500 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4 text-amber-600">
              <ShieldAlert size={36} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              শর্টকাট বা কপি-পেস্ট নিষিদ্ধ!
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-6 font-medium">
              পরীক্ষার চলাকালীন <span className="font-semibold text-gray-900">Copy, Cut, Paste, Select All বা মাউস রাইট ক্লিক</span> করা সম্পূর্ণ নিষিদ্ধ। প্রথমবার সতর্ক করা হলো। এর পর প্রতিবার <span className="text-amber-600 font-bold">১ ডিমেরিট পয়েন্ট</span> যুক্ত হবে।
            </p>
            <button
              onClick={() => setShowShortcutModal(false)}
              className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md active:scale-95"
            >
              আমি বুঝতে পেরেছি (I Understand)
            </button>
          </div>
        </div>
      )}

      {/* 2. Tab Switch / Window Blur (>10s) Auto-Submit Warning Modal */}
      {showTabSwitchModal && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-t-4 border-red-500 text-center flex flex-col items-center relative">
            <button 
              onClick={handleDismissTabModal}
              title="Close and submit"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-lg"
            >
              <X size={20} />
            </button>
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4 text-red-600 animate-pulse">
              <AlertTriangle size={36} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              ট্যাব পরিবর্তনের কারণে অটো-সাবমিট হচ্ছে!
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4 font-medium">
              আপনি ১০ সেকেন্ডের বেশি সময় পরীক্ষার পেজের বাইরে ছিলেন। নিয়ম লঙ্ঘনের কারণে আপনার খাতা অটো-সাবমিট করা হচ্ছে।
            </p>
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 w-full flex items-center justify-center gap-2 font-mono text-base font-bold">
              <span>স্বয়ংক্রিয় সাবমিট হতে বাকি:</span>
              <span className="text-xl text-red-600">{tabCountdown}s</span>
            </div>
            <button
              onClick={handleDismissTabModal}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md active:scale-95"
            >
              এখনই সাবমিট করুন (Submit Now)
            </button>
          </div>
        </div>
      )}

      {/* 3. Mobile Phone Detected (>5s) Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-t-4 border-red-500 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4 text-red-600 animate-bounce">
              <Smartphone size={36} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              মোবাইল ফোন সনাক্ত হয়েছে!
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4 font-medium">
              Please phone use koro na, nahole system paper auto submit korbe. ক্যামেরা ফ্রন্ট থেকে অবিলম্বে ফোন সরিয়ে কনফার্ম করুন।
            </p>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-xl mb-6 w-full flex items-center justify-center gap-2 font-mono text-sm font-semibold">
              <span>কনফার্ম না করলে অটো-সাবমিট:</span>
              <span className="text-base text-red-600 font-bold">{phoneCountdown}s</span>
            </div>
            <button
              onClick={handleConfirmPhoneRemoved}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              <span>আমি ফোন সরিয়ে ফেলেছি (Confirm Removed)</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Left Screen / Camera Absence (>10s) Auto-Submit Modal */}
      {showAbsenceModal && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-t-4 border-red-500 text-center flex flex-col items-center relative">
            <button 
              onClick={handleDismissAbsenceModal}
              title="Close and submit"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-lg"
            >
              <X size={20} />
            </button>
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4 text-red-600 animate-pulse">
              <EyeOff size={36} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              ক্যামেরা থেকে অনুপস্থিতি সনাক্ত হয়েছে!
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4 font-medium">
              আপনি ১০ সেকেন্ডের বেশি সময় ক্যামেরা স্ক্রিনের বাইরে ছিলেন বা স্ক্রিন ব্লাঙ্ক ছিল। আপনার খাতা অটো-সাবমিট করা হচ্ছে।
            </p>
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 w-full flex items-center justify-center gap-2 font-mono text-base font-bold">
              <span>স্বয়ংক্রিয় সাবমিট হতে বাকি:</span>
              <span className="text-xl text-red-600">{absenceCountdown}s</span>
            </div>
            <button
              onClick={handleDismissAbsenceModal}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md active:scale-95"
            >
              এখনই সাবমিট করুন (Submit Now)
            </button>
          </div>
        </div>
      )}

      {/* 5. Demerit Points Reached 10 Auto-Submit Modal */}
      {showDemeritModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-t-4 border-red-600 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4 text-red-600 animate-pulse">
              <ShieldAlert size={38} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              ১০ ডিমেরিট পয়েন্ট অতিক্রম!
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-6 font-medium">
              সর্বোচ্চ ডিমেরিট পয়েন্ট সীমা (১০ পয়েন্ট) অতিক্রম করার কারণে সিস্টেম আপনার পরীক্ষা স্বয়ংক্রিয়ভাবে সাবমিট করছে।
            </p>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-700 rounded-xl font-mono text-sm font-semibold">
              <Clock size={16} className="animate-spin" />
              <span>খাতা সাবমিট হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. Network Disconnected / Hold Modal (5-Minute Countdown) */}
      {isOffline && (
        <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none pointer-events-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border-t-4 border-amber-500 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4 text-amber-600 animate-pulse">
              <WifiOff size={36} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              ইন্টারনেট সংযোগ বিচ্ছিন্ন হয়েছে!
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4 font-medium">
              আপনার নেটওয়ার্ক সংযোগ বিচ্ছিন্ন হওয়ায় পরীক্ষা সাময়িকভাবে <span className="text-amber-700 font-bold">স্থগিত (On Hold)</span> করা হয়েছে। কোনো প্রশ্নের উত্তর গ্রহণ বা পরিবর্তন করা যাবে না। ইন্টারনেট সংযোগ পুনরায় ফিরে আসা মাত্রই এই উইন্ডো স্বয়ংক্রিয়ভাবে বন্ধ হবে এবং পরীক্ষা চালু হবে।
            </p>
            
            <div className="bg-amber-50 border border-amber-200 text-amber-900 px-5 py-3 rounded-2xl mb-4 w-full flex flex-col items-center justify-center gap-1">
              <span className="text-xs font-semibold text-amber-800">অটো-সাবমিট হতে বাকি (Auto-Submit in):</span>
              <span className="text-2xl font-mono font-bold text-red-600">
                {formatTime(offlineCountdown)}
              </span>
              <span className="text-[11px] text-amber-700 font-medium">
                ৫ মিনিটের মধ্যে নেট না আসলে খাতা স্বয়ংক্রিয়ভাবে জমা হয়ে যাবে।
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
              <RefreshCw size={14} className="animate-spin text-amber-600" />
              <span>ইন্টারনেট পুনঃসংযোগের জন্য অপেক্ষা করা হচ্ছে...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
