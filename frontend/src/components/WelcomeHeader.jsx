import React, { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';

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
    <div className="bg-dark-850 border border-dark-700 rounded-2xl py-8 px-6 md:px-8 mb-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in min-h-[100px]">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          {content.msg} {userName && <span className="text-lime-500">{userName}</span>}
        </h1>
        <p className="text-gray-400 mt-1 text-sm font-medium">{content.tag}</p>
      </div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 bg-dark-900 px-5 py-3 rounded-xl border border-dark-700 shrink-0">
        <div className="flex items-center gap-2 text-gray-300">
          <Calendar size={18} className="text-lime-500" />
          <span className="text-sm font-semibold">{formatDate(currentTime)}</span>
        </div>
        <div className="hidden sm:block w-px h-6 bg-dark-700"></div>
        <div className="flex items-center gap-2 text-gray-300">
          <Clock size={18} className="text-lime-500" />
          <span className="text-sm font-bold tracking-wider">{formatTime(currentTime)}</span>
        </div>
      </div>
    </div>
  );
};

export default WelcomeHeader;
