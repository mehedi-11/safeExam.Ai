import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, UserCheck, CheckCircle, Info, Key, Copy, 
  Check, Play, AlertCircle, XCircle, ArrowRight, BookOpen, Layers
} from 'lucide-react';
import api from '../api/axiosConfig';
import Modal from '../components/Modal';

const StudentEvents = () => {
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'registered'
  const [events, setEvents] = useState([]);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Registration modal states
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '' });
  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState("");

  // Exam Status Modal state
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    title: "",
    type: "info", // 'not_created' | 'not_live' | 'ended' | 'live'
    message: "",
    exam: null,
    event: null
  });
  
  const [copiedCode, setCopiedCode] = useState(null);
  const [startingExam, setStartingExam] = useState(false);
  const [launchError, setLaunchError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventsRes, regRes] = await Promise.all([
        api.get('/events').catch(() => ({ data: [] })),
        api.get('/events/my-registrations').catch(() => ({ data: [] }))
      ]);

      const sortedEvents = (eventsRes.data || []).sort((a, b) => {
        const now = new Date();
        const aEnded = a.end_date && new Date(a.end_date) < now;
        const bEnded = b.end_date && new Date(b.end_date) < now;
        if (aEnded === bEnded) {
          return new Date(b.event_date) - new Date(a.event_date);
        }
        return aEnded ? 1 : -1;
      });

      setEvents(sortedEvents);
      setRegisteredEvents(regRes.data || []);
    } catch (err) {
      console.error('Failed to load event data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setEmailError("");
    setFormError("");

    if (!regForm.email.includes('@')) {
      setEmailError("Invalid email. An '@' symbol is required.");
      return;
    }

    try {
      const res = await api.post(`/events/${selectedEventId}/register`, regForm);
      if (res.data && res.data.success === false) {
        setFormError(res.data.message || 'Already registered with this email');
        return;
      }
      setIsRegisterModalOpen(false);
      setIsSuccessModalOpen(true);
      // Refresh registered events
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to register');
    }
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleGoForExam = (regItem) => {
    setLaunchError("");
    const { event, exam } = regItem;

    if (!exam) {
      setStatusModal({
        isOpen: true,
        title: "Exam Not Created Yet",
        type: "not_created",
        message: `The instructor has not yet created or configured an exam under the event "${event?.title || 'this event'}". Please check back closer to the scheduled event time.`,
        exam: null,
        event
      });
      return;
    }

    if (exam.is_ended) {
      setStatusModal({
        isOpen: true,
        title: "Exam Period Ended",
        type: "ended",
        message: `The time limit and availability window for the exam "${exam.title}" has ended. Submissions are no longer accepted.`,
        exam,
        event
      });
      return;
    }

    if (!exam.is_live) {
      setStatusModal({
        isOpen: true,
        title: "Exam Is Not Live Yet",
        type: "not_live",
        message: `The exam "${exam.title}" has been prepared, but is not currently Live. The instructor will activate it at the scheduled examination time.`,
        exam,
        event
      });
      return;
    }

    // Exam is Live!
    setStatusModal({
      isOpen: true,
      title: "Exam Is Live!",
      type: "live",
      message: `The exam "${exam.title}" is currently LIVE and open for candidates. Your Secret Code will be verified automatically when you enter.`,
      exam,
      event
    });
  };

  const handleLaunchExam = async (exam) => {
    if (!exam) return;
    try {
      setStartingExam(true);
      setLaunchError("");
      const pwd = exam.exam_password || "";
      
      await api.post(`/student/exams/${exam._id}/start`, { exam_password: pwd });

      sessionStorage.setItem(`exam_pwd_${exam._id}`, pwd);
      localStorage.setItem(`exam_pwd_${exam._id}`, pwd);
      setStatusModal(prev => ({ ...prev, isOpen: false }));
      window.open(`/exam/${exam._id}`, '_blank');
    } catch (err) {
      setLaunchError(err.response?.data?.message || "Failed to start exam. Please verify credentials or attempts limit.");
    } finally {
      setStartingExam(false);
    }
  };

  const registeredEventIds = new Set(registeredEvents.map(r => r.event?._id));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-tomato-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 text-sm font-medium">Loading events portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="text-tomato-500" /> Event &amp; Exam Center
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Browse upcoming institution events or track your registered exams and access codes.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-gray-100 p-1 rounded-xl self-start sm:self-auto border border-gray-200">
          <button
            onClick={() => setActiveTab('events')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'events'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers size={14} />
            All Events
            <span className="ml-1 px-1.5 py-0.2 bg-gray-200 text-gray-700 rounded-full text-[10px]">
              {events.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('registered')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'registered'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CheckCircle size={14} className={registeredEvents.length > 0 ? "text-emerald-500" : ""} />
            Registered Events
            <span className="ml-1 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
              {registeredEvents.length}
            </span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: ALL EVENTS (BROWSE & REGISTER)                   */}
      {/* ======================================================== */}
      {activeTab === 'events' && (
        <>
          {events.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-gray-500">
              <Calendar className="mx-auto text-gray-300 mb-3" size={40} />
              <p className="text-base font-semibold text-gray-700">No events currently available.</p>
              <p className="text-xs text-gray-400 mt-1">Check back soon for new departmental and institutional events.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((evt) => {
                const isAlreadyRegistered = registeredEventIds.has(evt._id);
                return (
                  <div 
                    key={evt._id} 
                    className="card-hover p-6 flex flex-col justify-between h-full bg-white rounded-2xl border border-gray-200 shadow-sm relative cursor-pointer" 
                    onClick={() => navigate(`/event/${evt._id}`)}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-tomato-100 text-tomato-700">
                          LIVE
                        </span>
                        {isAlreadyRegistered && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <CheckCircle size={12} /> Registered
                          </span>
                        )}
                      </div>

                      {evt.image && (
                        <div className="mb-4 rounded-xl overflow-hidden h-36 w-full bg-gray-100 border border-gray-200">
                          <img src={evt.image} alt={evt.title} className="w-full h-full object-cover" />
                        </div>
                      )}

                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{evt.title}</h3>
                      <div 
                        className="text-sm text-gray-500 mb-4 line-clamp-3 prose prose-sm" 
                        dangerouslySetInnerHTML={{ __html: evt.description }}
                      ></div>

                      <div className="space-y-2 mb-6">
                        <div className="flex items-center text-sm text-gray-500 gap-2">
                          <Clock size={16} className="text-tomato-500 shrink-0" />
                          <span><strong className="font-semibold text-gray-700">Event Time:</strong> {new Date(evt.event_date).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      {isAlreadyRegistered ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab('registered');
                          }}
                          className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-2.5 rounded-xl text-xs font-bold transition-colors flex justify-center items-center gap-1.5"
                        >
                          <CheckCircle size={14} /> View in Registered Tab
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedEventId(evt._id); 
                            const userStr = localStorage.getItem('user');
                            let userName = '', userEmail = '';
                            if (userStr) {
                              try {
                                const user = JSON.parse(userStr);
                                userName = user.name || '';
                                userEmail = user.email || '';
                              } catch (err) {}
                            }
                            setRegForm({ name: userName, email: userEmail, phone: '' });
                            setEmailError("");
                            setFormError("");
                            setIsRegisterModalOpen(true); 
                          }}
                          className="flex-1 bg-gray-900 hover:bg-black text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-gray-200/50 flex justify-center items-center gap-1.5"
                        >
                          <UserCheck size={14} /> Register for Event
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 2: REGISTERED EVENTS (TABLE VIEW)                    */}
      {/* ======================================================== */}
      {activeTab === 'registered' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 text-blue-900 p-4 rounded-xl text-xs flex items-start gap-3">
            <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-sm">Exam Portal Information</p>
              <p className="text-blue-700 mt-0.5">
                Here are the events you are officially registered for. When the instructor prepares and publishes the exam, 
                your <strong>Secret Code</strong> will appear here. When the exam is made <strong>Live</strong>, click <strong>"Go for Exam"</strong> to start directly.
              </p>
            </div>
          </div>

          {registeredEvents.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-gray-500">
              <BookOpen className="mx-auto text-gray-300 mb-3" size={40} />
              <p className="text-base font-semibold text-gray-700">You haven't registered for any events yet.</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">Browse available events and register to participate in online tests.</p>
              <button
                onClick={() => setActiveTab('events')}
                className="px-5 py-2.5 bg-tomato-500 hover:bg-tomato-600 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                Browse All Events <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-12 text-center">#</th>
                      <th className="py-3.5 px-4">Event Name &amp; Schedule</th>
                      <th className="py-3.5 px-4">Exam Status</th>
                      <th className="py-3.5 px-4">Exam Secret Code</th>
                      <th className="py-3.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {registeredEvents.map((item, idx) => {
                      const { event, exam } = item;
                      if (!event) return null;

                      // Determine exam status badge
                      let statusBadge = null;
                      if (!exam) {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                            <Clock size={12} /> Not Created Yet
                          </span>
                        );
                      } else if (exam.is_ended) {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-100 text-red-700">
                            <XCircle size={12} /> Exam Ended
                          </span>
                        );
                      } else if (exam.is_live) {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Live Now
                          </span>
                        );
                      } else {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                            <Clock size={12} /> Scheduled (Not Live)
                          </span>
                        );
                      }

                      return (
                        <tr key={item._id} className="hover:bg-gray-50/70 transition-colors">
                          {/* 1. Index */}
                          <td className="py-4 px-4 text-center text-gray-400 font-medium">{idx + 1}</td>

                          {/* 2. Event Name & Schedule */}
                          <td className="py-4 px-4">
                            <div className="font-semibold text-gray-900 text-sm">{event.title}</div>
                            <div className="flex items-center gap-2 text-gray-500 text-[11px] mt-1 font-normal">
                              <span className="flex items-center gap-1">
                                <Clock size={12} className="text-gray-400" />
                                {new Date(event.event_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                              </span>
                              {exam && (
                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                                  {exam.duration_minutes} mins
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. Exam Status */}
                          <td className="py-4 px-4">{statusBadge}</td>

                          {/* 4. Exam Secret Code */}
                          <td className="py-4 px-4">
                            {exam && exam.exam_password ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200/80 border border-gray-300 rounded-lg font-mono text-xs font-semibold text-gray-800 transition-colors shadow-xs">
                                <Key size={13} className="text-tomato-500 shrink-0" />
                                <span>{exam.exam_password}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(exam.exam_password)}
                                  className="ml-1 p-1 hover:text-black transition-colors"
                                  title="Copy Secret Code"
                                >
                                  {copiedCode === exam.exam_password ? (
                                    <Check size={13} className="text-emerald-600" />
                                  ) : (
                                    <Copy size={13} className="text-gray-500" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs italic font-normal">
                                Not Available Yet
                              </span>
                            )}
                          </td>

                          {/* 5. Go for Exam Button */}
                          <td className="py-4 px-4 text-center">
                            {exam && exam.is_live && !exam.is_ended ? (
                              <button
                                onClick={() => handleGoForExam(item)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-95"
                              >
                                <Play size={13} className="fill-white" /> Go for Exam
                              </button>
                            ) : (
                              <button
                                onClick={() => handleGoForExam(item)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-xs transition-colors border border-gray-200"
                              >
                                Go for Exam
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REGISTRATION FORM                                 */}
      {/* ======================================================== */}
      <Modal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} title="Event Registration">
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div className="bg-blue-50 text-blue-900 p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 border border-blue-200">
            <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
            <p>
              Confirm your registration for this event. Once registered, your entry and Secret Code will appear in the 
              <strong> "Registered Events"</strong> tab, where you can enter the live exam directly.
            </p>
          </div>

          {formError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-semibold border border-red-200 text-center">
              {formError}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Full Name <span className="text-red-500 ml-1">*</span></label>
            <input 
              type="text" 
              required 
              readOnly
              value={regForm.name} 
              onChange={e => setRegForm({...regForm, name: e.target.value})} 
              className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-xl text-sm cursor-not-allowed text-gray-600 focus:outline-none" 
              placeholder="e.g. John Doe"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Email Address <span className="text-red-500 ml-1">*</span></label>
            <input 
              type="text" 
              required 
              readOnly
              value={regForm.email} 
              onChange={e => {
                setRegForm({...regForm, email: e.target.value});
                if(emailError) setEmailError("");
              }} 
              className={`w-full px-4 py-2 bg-gray-100 border rounded-xl text-sm cursor-not-allowed text-gray-600 focus:outline-none transition-colors ${emailError ? 'border-red-500 focus:border-red-500' : 'border-gray-200'}`} 
              placeholder="johndoe@example.com"
            />
            {emailError && <p className="text-red-500 text-xs font-bold mt-1">{emailError}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Phone Number</label>
            <input 
              type="tel" 
              value={regForm.phone} 
              onChange={e => setRegForm({...regForm, phone: e.target.value})} 
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-800 transition-colors" 
              placeholder="+8801XXXXXXXXX"
            />
          </div>

          <div className="pt-2">
            <button type="submit" className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors shadow-md shadow-gray-200/50">
              Confirm Registration
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: SUCCESSFUL REGISTRATION                           */}
      {/* ======================================================== */}
      <Modal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)}>
        <div className="py-6 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={36} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Registration Confirmed!</h2>
          <p className="text-gray-600 text-sm max-w-sm mx-auto">
            You are now registered for this event. When the exam is published, your <strong>Secret Code</strong> and exam access will be ready in your <strong>"Registered Events"</strong> tab.
          </p>
          <div className="flex gap-3 justify-center pt-3">
            <button 
              onClick={() => {
                setIsSuccessModalOpen(false);
                setActiveTab('registered');
              }} 
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              View in Registered Tab <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: EXAM STATUS & LAUNCH FEEDBACK                     */}
      {/* ======================================================== */}
      <Modal
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
        title={statusModal.title}
      >
        <div className="py-4 space-y-4">
          {/* Status Header Icon */}
          <div className="flex items-center gap-3 p-4 rounded-xl border">
            {statusModal.type === 'live' && (
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Play size={24} className="fill-emerald-600" />
              </div>
            )}
            {statusModal.type === 'not_live' && (
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <Clock size={24} />
              </div>
            )}
            {statusModal.type === 'not_created' && (
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                <AlertCircle size={24} />
              </div>
            )}
            {statusModal.type === 'ended' && (
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <XCircle size={24} />
              </div>
            )}
            <div>
              <p className="font-bold text-gray-900 text-sm">{statusModal.title}</p>
              <p className="text-gray-500 text-xs mt-0.5">{statusModal.message}</p>
            </div>
          </div>

          {/* Details Section if Exam Exists */}
          {statusModal.exam && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-gray-600">
                <span className="font-medium">Exam Name:</span>
                <span className="font-bold text-gray-900">{statusModal.exam.title}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span className="font-medium">Duration:</span>
                <span className="font-bold text-gray-900">{statusModal.exam.duration_minutes} Minutes</span>
              </div>
              {statusModal.exam.exam_password && (
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="font-medium text-gray-700">Exam Secret Code:</span>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-300 rounded-lg font-mono font-bold text-gray-900">
                    <Key size={13} className="text-tomato-500" />
                    <span>{statusModal.exam.exam_password}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(statusModal.exam.exam_password)}
                      className="ml-1 p-0.5 hover:text-black transition-colors"
                      title="Copy Secret Code"
                    >
                      {copiedCode === statusModal.exam.exam_password ? (
                        <Check size={12} className="text-emerald-600" />
                      ) : (
                        <Copy size={12} className="text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {launchError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold text-center">
              {launchError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
            >
              Close
            </button>

            {statusModal.type === 'live' && statusModal.exam && (
              <button
                onClick={() => handleLaunchExam(statusModal.exam)}
                disabled={startingExam}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
              >
                {startingExam ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Starting Exam...
                  </>
                ) : (
                  <>
                    <Play size={14} className="fill-white" /> Launch Exam Now
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudentEvents;
