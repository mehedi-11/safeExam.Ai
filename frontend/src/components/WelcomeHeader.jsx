import React, { useState, useEffect } from 'react';
import { Clock, Calendar, ShieldCheck, Activity, Zap } from 'lucide-react';

const welcomeData = [
  { msg: "Welcome Back, Champion!", tag: "Ready to conquer today's challenges?" },
  { msg: "Hello there, Achiever!", tag: "Let's make today productive and successful." },
  { msg: "Greetings, Trailblazer!", tag: "Your next big breakthrough awaits." },
  { msg: "Good to see you!", tag: "Consistency is the key to excellence." },
  { msg: "Welcome Aboard!", tag: "Empowering education, one step at a time." },
  { msg: "Hey, Visionary!", tag: "Transforming learning into an incredible journey." },
  { msg: "Welcome to your Hub!", tag: "Everything you need to succeed is right here." },
  { msg: "Glad you're here!", tag: "Focus on your goals, we'll handle the rest." },
  { msg: "Hello, Innovator!", tag: "Pushing boundaries in the digital learning space." },
  { msg: "Welcome, Leader!", tag: "Inspiring success and continuous growth." }
];

const WelcomeHeader = ({ userName }) => {
  const [content, setContent] = useState({ msg: "", tag: "" });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Select random message on mount
    const randomIndex = Math.floor(Math.random() * welcomeData.length);
    setContent(welcomeData[randomIndex]);

    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl py-10 px-6 md:px-10 mb-6 shadow-md shadow-gray-200/50 flex flex-col md:flex-row justify-between items-center gap-8 animate-fade-in text-white border border-gray-800">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-48 h-48 rounded-full bg-white opacity-10 blur-2xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left mx-auto md:mx-0 w-full md:w-auto">
        <h1 className="text-3xl font-extrabold flex flex-wrap justify-center md:justify-start items-center gap-2 drop-shadow-md shadow-gray-200/50">
          {content.msg} {userName && <span className="text-white/90 underline decoration-white/40 decoration-wavy underline-offset-4">{userName}</span>}
        </h1>
        <p className="text-gray-300 mt-2 text-sm md:text-base font-medium opacity-90">{content.tag}</p>
        
        <div className="mt-6 flex flex-wrap justify-center md:justify-start items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-colors px-4 py-2 rounded-xl border border-white/10 cursor-default">
            <ShieldCheck size={16} className="text-green-400" />
            <span className="text-xs font-semibold tracking-wide text-white/90">System Secure</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-colors px-4 py-2 rounded-xl border border-white/10 cursor-default">
            <Activity size={16} className="text-tomato-400" />
            <span className="text-xs font-semibold tracking-wide text-white/90">Proctoring Active</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-colors px-4 py-2 rounded-xl border border-white/10 cursor-default">
            <Zap size={16} className="text-yellow-400" />
            <span className="text-xs font-semibold tracking-wide text-white/90">Services Online</span>
          </div>
        </div>
      </div>
      
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/20 shrink-0 shadow-inner mx-auto md:mx-0 w-full sm:w-auto">
        <div className="flex items-center gap-2 text-white/95">
          <Calendar size={18} className="text-white" />
          <span className="text-sm font-semibold tracking-wide">{formatDate(currentTime)}</span>
        </div>
        <div className="hidden sm:block w-px h-6 bg-white/20"></div>
        <div className="flex items-center gap-2 text-white">
          <Clock size={18} className="text-white font-bold" />
          <span className="text-sm font-bold tracking-wider">{formatTime(currentTime)}</span>
        </div>
      </div>
    </div>
  );
};

export default WelcomeHeader;
