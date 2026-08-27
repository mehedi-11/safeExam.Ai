import React, { useState, useEffect, useRef } from 'react';
import { Camera, Play, Square, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export default function ModelTest() {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [detectedLog, setDetectedLog] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const modelRef = useRef(null);
  const loopRef = useRef(null);
  const logContainerRef = useRef(null);

  // Load Model
  const loadModel = async () => {
    setLoadingModel(true);
    try {
      const model = await cocoSsd.load();
      modelRef.current = model;
      setModelReady(true);
    } catch (err) {
      console.error("Error loading TFJS model", err);
      alert("Failed to load TensorFlow model. Check your internet connection.");
    } finally {
      setLoadingModel(false);
    }
  };

  useEffect(() => {
    loadModel();
    return () => stopCamera();
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [detectedLog]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
      startDetectionLoop();
    } catch (err) {
      console.error("Camera access denied:", err);
      alert("Camera access denied or device not found.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    stopDetectionLoop();
  };

  const startDetectionLoop = () => {
    setIsDetecting(true);
    setTimeout(() => {
      loopRef.current = setInterval(detectFrame, 1500); // 1.5s interval
    }, 1000);
  };

  const stopDetectionLoop = () => {
    setIsDetecting(false);
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
  };

  const detectFrame = async () => {
    if (modelRef.current && videoRef.current && videoRef.current.readyState === 4) {
      try {
        const predictions = await modelRef.current.detect(videoRef.current, 50, 0.25);
        
        let currentObjects = new Set();
        
        const allowedItems = {
          'person': 'Person',
          'cell phone': 'Mobile',
          'mobile': 'Mobile',
          'calculator': 'Calculator',
          'book': 'Book/Notebook',
          'notebook': 'Book/Notebook',
          'wearing-earphones': 'Wearing-Earphones',
          'headphone': 'Headphone'
        };

        predictions.forEach(prediction => {
          const className = prediction.class.toLowerCase();
          
          if (allowedItems[className]) {
             currentObjects.add(allowedItems[className]);
          }
        });

        if (currentObjects.size > 0) {
          addLogEntry(Array.from(currentObjects).join(', '));
        }

      } catch (err) {
        console.error("Detection error:", err);
      }
    }
  };

  const addLogEntry = (objects) => {
    const time = new Date().toLocaleTimeString();
    setDetectedLog(prev => [...prev.slice(-49), { time, objects }]); // Keep last 50 logs
  };

  const clearLogs = () => setDetectedLog([]);

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-dark-900 tracking-tight">AI Model Tester</h2>
          <p className="text-gray-500 text-sm mt-1">
            Test the YOLOv11 object detection model in real-time.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white shadow-sm text-xs font-bold text-gray-500">
            {modelReady ? (
              <><ShieldCheck size={14} className="text-green-500" /> Model Ready</>
            ) : loadingModel ? (
              <><Activity size={14} className="text-blue-500 animate-spin" /> Loading Model...</>
            ) : (
              <><AlertTriangle size={14} className="text-orange-500" /> Model Not Loaded</>
            )}
          </div>
          
          {isCameraActive ? (
            <button
              onClick={stopCamera}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-bold transition-all shadow-sm"
            >
              <Square size={16} /> Stop Camera
            </button>
          ) : (
            <button
              onClick={startCamera}
              disabled={!modelReady}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                modelReady 
                  ? "bg-dark-900 text-white hover:bg-dark-800 shadow-dark-900/20" 
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <Play size={16} /> Start Camera
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-sm h-full flex flex-col">
            <h4 className="font-bold text-[10px] uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-1.5">
              <Camera size={14} className="text-blue-500" />
              <span>Camera Monitor Preview</span>
              {isDetecting && (
                <span className="flex h-2 w-2 relative ml-auto">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              )}
            </h4>
            
            <div className="flex-1 w-full aspect-[4/3] bg-dark-900 rounded-xl overflow-hidden border border-gray-200 relative flex items-center justify-center">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover relative z-10"
              />
              
              {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-20">
                  <div className="w-12 h-12 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center mb-3">
                    <Camera size={24} />
                  </div>
                  <span className="text-sm font-bold text-gray-300">Camera is Inactive</span>
                  <span className="text-xs text-gray-500 mt-1">Click 'Start Camera' to begin testing</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Feed */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-150 rounded-2xl shadow-sm h-[500px] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-150 flex justify-between items-center bg-gray-50/50">
              <h4 className="font-bold text-[10px] uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Activity size={14} className="text-blue-500" />
                <span>Live Detection Feed</span>
              </h4>
              <button 
                onClick={clearLogs}
                className="text-[10px] font-bold text-gray-400 hover:text-dark-900 transition-colors uppercase tracking-widest"
              >
                Clear
              </button>
            </div>
            
            <div 
              ref={logContainerRef}
              className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50/30"
            >
              {detectedLog.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Activity size={24} className="mb-2 opacity-20" />
                  <p className="text-xs font-bold">No items detected yet</p>
                </div>
              ) : (
                detectedLog.map((log, i) => (
                  <div key={i} className="bg-white border border-gray-200 p-3 rounded-xl shadow-sm animate-fade-in">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                        {log.time}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-dark-900 capitalize leading-relaxed">
                      {log.objects}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
