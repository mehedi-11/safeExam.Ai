import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api, { API_BASE_URL } from '../api/axiosConfig';
import { 
  Camera, ShieldAlert, AlertTriangle, 
  CheckSquare, ArrowLeft, Clock, Terminal,
  Smartphone, EyeOff, CheckCircle, X, WifiOff, RefreshCw
} from 'lucide-react';
import '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export default function ExamInterface() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { showConfirm } = useAlert();
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
  const [showRulesModal, setShowRulesModal] = useState(false);
  
  // Modal States
  const [showReloadModal, setShowReloadModal] = useState(false);
  const hasSubmittedRef = useRef(false);
  
  // Audio Speech Monitoring
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const speechStartRef = useRef(null);
  const lastSpeechLogRef = useRef(0);

  // Network Offline / Hold States (30-second countdown)
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineCountdown, setOfflineCountdown] = useState(30); // 30 seconds
  const offlineCountdownIntervalRef = useRef(null);
  const offlineStartTimeRef = useRef(null);

  const lastBlurLogRef = useRef(0);
  const lastShortcutLogRef = useRef(0);

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
        alert('Browser reload detected! Your exam has been auto-submitted as per rules.');
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

  // Shortcut key handler (+1 demerit point)
  const triggerShortcutAction = (actionName) => {
    const now = Date.now();
    if (now - lastShortcutLogRef.current < 800) return;
    lastShortcutLogRef.current = now;
    logCheating('Shortcut Activity', `Prohibited shortcut pressed (${actionName})`, 1, false);
  };

  // 2. Client-side cheating triggers (Copy/Paste hooks, Focus tracking, Shortcuts)
  useEffect(() => {
    if (!examStarted || isBlocked) return;

    // Detect prohibited shortcuts (Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A) and Reload (F5, Ctrl+R)
    const handleKeyDown = (e) => {
      // Rule 8: Reload Modal Interceptor
      if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r')) {
        e.preventDefault();
        setShowReloadModal(true);
        return;
      }

      // Rule 1: Copy/Paste/Cut/Select All: +1 point
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

    // Rule 2: Tab Switching or Minimized: +2 points
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const now = Date.now();
        if (now - lastBlurLogRef.current > 1200) {
          lastBlurLogRef.current = now;
          logCheating('Tab Switching', 'Student switched to another tab or minimized browser', 2, false);
        }
      }
    };

    // Rule 2: Clicking outside exam screen / window blur: +2 points
    const handleWindowBlur = () => {
      const now = Date.now();
      if (now - lastBlurLogRef.current > 1200) {
        lastBlurLogRef.current = now;
        logCheating('Window Blur', 'Student clicked outside the exam window', 2, false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
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
      setOfflineCountdown(30); // 30 seconds

      if (offlineCountdownIntervalRef.current) clearInterval(offlineCountdownIntervalRef.current);
      let count = 30;
      offlineCountdownIntervalRef.current = setInterval(() => {
        count -= 1;
        setOfflineCountdown(count);
        if (count <= 0) {
          clearInterval(offlineCountdownIntervalRef.current);
          handleSubmitExam(true, 'Auto-Submitted: Internet disconnected for more than 30 seconds');
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

  // Rule 4: Handle 5+ demerit points auto-submit
  useEffect(() => {
    if (examStarted && demerits >= 5 && !hasSubmittedRef.current) {
      handleSubmitExam(true, 'Auto-Submitted: Demerit points reached threshold (5+ points)');
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

        // Setup Web Audio API Speech / Voice monitoring (Rule 3)
        try {
          const audioTracks = mediaStream.getAudioTracks();
          if (audioTracks && audioTracks.length > 0) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
              const audioCtx = new AudioContextClass();
              const source = audioCtx.createMediaStreamSource(mediaStream);
              const analyser = audioCtx.createAnalyser();
              analyser.fftSize = 256;
              source.connect(analyser);
              audioContextRef.current = audioCtx;
              analyserRef.current = analyser;
            }
          }
        } catch (audioErr) {
          console.warn('Audio analyser setup error:', audioErr);
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

                // Auto-Submit Rule 1: Mobile phone detected for >= 5s -> Instant Auto-Submit (No modal)
                if (item === 'cell phone') {
                  if (elapsed >= 5000 && !hasSubmittedRef.current) {
                    handleSubmitExam(true, 'Auto-Submitted: Mobile phone detected on camera for 5 seconds');
                  }
                } 
                // Auto-Submit Rule 2: Multiple persons detected for >= 5s -> Instant Auto-Submit (No modal)
                else if (item === 'multiple persons') {
                  if (elapsed >= 5000 && !hasSubmittedRef.current) {
                    handleSubmitExam(true, 'Auto-Submitted: Multiple persons detected in camera for 5 seconds');
                  }
                }
                // Auto-Submit Rule 3: Book / Notebook detected for >= 5s -> Instant Auto-Submit
                else if (item === 'book') {
                  if (elapsed >= 5000 && !hasSubmittedRef.current) {
                    handleSubmitExam(true, 'Auto-Submitted: Book/Notebook detected in camera for 5 seconds');
                  }
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

            // Auto-Submit Rule 5: Camera blur / Student absent from camera for >= 5s -> Instant Auto-Submit
            if (detectedItems.has('no person visible')) {
              if (!timers['no person visible']) {
                timers['no person visible'] = now;
              } else {
                const outDuration = now - timers['no person visible'];
                if (outDuration >= 5000 && !hasSubmittedRef.current) {
                  handleSubmitExam(true, 'Auto-Submitted: Student absent / no face detected in camera for 5 seconds');
                }
              }
            } else {
              delete timers['no person visible'];
            }

            // Behavioral Rule 3: Check voice / speaking via Web Audio API (+1 demerit)
            if (analyserRef.current && !hasSubmittedRef.current) {
              try {
                const bufferLength = analyserRef.current.frequencyBinCount;
                const audioData = new Uint8Array(bufferLength);
                analyserRef.current.getByteFrequencyData(audioData);
                let audioSum = 0;
                for (let i = 0; i < bufferLength; i++) audioSum += audioData[i];
                const avgVolume = audioSum / bufferLength;

                if (avgVolume > 38) {
                  if (!speechStartRef.current) {
                    speechStartRef.current = now;
                  } else if (now - speechStartRef.current >= 1500) {
                    if (!lastSpeechLogRef.current || now - lastSpeechLogRef.current > 6000) {
                      lastSpeechLogRef.current = now;
                      logCheating('talking', 'Student speaking or verbal communication detected', 1, false);
                    }
                  }
                } else {
                  speechStartRef.current = null;
                }
              } catch (micErr) {
                // Ignore audio read errors
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
      if (res.data.status === 'completed' && !hasSubmittedRef.current) {
        stopWebcam();
        alert('A critical violation was detected! Your exam has been auto-submitted.');
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
      alert(isAuto ? `Exam auto-submitted: ${submissionReason}` : 'Exam submitted successfully.');
      navigate('/dashboard/student');
    } catch (err) {
      alert(isAuto ? `Exam auto-submitted: ${submissionReason}` : 'Exam submitted: ' + (err.response?.data?.message || 'Done'));
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
              <p className="font-semibold text-tomato-600 mb-2">Please read the updated proctoring rules carefully before starting. Reaching 5 demerit points or violating critical AI rules will result in immediate automatic submission.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><span className="font-bold">Copy / Paste / Cut / Select All (Ctrl+C, Ctrl+V, etc.):</span> Adds 1 Demerit Point per attempt.</li>
                <li><span className="font-bold">Tab Switching / Window Blur / Minimize:</span> Adds 2 Demerit Points per event.</li>
                <li><span className="font-bold">Talking / Speaking:</span> Voice or talking detected adds 1 Demerit Point.</li>
                <li><span className="font-bold text-red-600">Demerit Threshold:</span> Reaching 5+ demerit points results in immediate Auto-Submission.</li>
                <li><span className="font-bold text-red-600">Mobile Phone (5s):</span> Mobile phone detected for 5 seconds triggers immediate Auto-Submission.</li>
                <li><span className="font-bold text-red-600">Multiple Persons (5s):</span> More than 1 person visible for 5 seconds triggers immediate Auto-Submission.</li>
                <li><span className="font-bold text-red-600">Book / Notebook (5s):</span> Book/notebook in hand or view for 5 seconds triggers immediate Auto-Submission.</li>
                <li><span className="font-bold text-red-600">Absence / Camera Blur (5s):</span> Leaving camera view or blurred camera for 5 seconds triggers immediate Auto-Submission.</li>
                <li><span className="font-bold">Network Disconnection:</span> If offline for more than 30 seconds, exam auto-submits.</li>
                <li><span className="font-bold">Page Reload:</span> Confirmation modal appears; confirming reload will auto-submit exam paper.</li>
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
                  const confirmed = await showConfirm({
                      title: "Abandon Exam",
                      message: "Are you sure you want to exit? Your progress will not be submitted and this attempt will be closed.",
                      confirmText: "Exit Exam",
                      isDanger: true
                    });
                    if (confirmed) {
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
                demerits >= 4 ? 'bg-red-100 text-red-700' :
                demerits >= 2 ? 'bg-yellow-100 text-yellow-700' :
                'bg-tomato-150 text-tomato-700'
              }`}>
                {demerits} / 5
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

      {/* Rule 8: Page Reload Confirmation Modal */}
      {showReloadModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-t-4 border-red-500 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4 text-red-600 animate-spin">
              <RefreshCw size={36} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              পেজ রিলোড নিশ্চিতকরণ (Confirm Reload)
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-6 font-medium">
              আপনি কি সত্যিই পেজ রিলোড করতে চান? <br />
              <span className="text-red-600 font-bold">সতর্কতা: রিলোড করলে আপনার পরীক্ষার খাতা সাথে সাথে AUTO-SUBMIT হয়ে যাবে!</span>
            </p>
            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowReloadModal(false)}
                className="flex-1 py-3 px-4 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
              >
                বাতিল (Cancel)
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReloadModal(false);
                  handleSubmitExam(true, 'Auto-Submitted: Student confirmed page reload');
                }}
                className="flex-1 py-3 px-4 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition cursor-pointer"
              >
                রিলোড ও সাবমিট
              </button>
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
              ইন্টারনেট সংযোগ বিচ্ছিন্ন হয়েছে! (Offline)
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
