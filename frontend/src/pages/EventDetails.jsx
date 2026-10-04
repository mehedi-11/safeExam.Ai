import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import Modal from '../components/Modal';
import { Calendar, Clock, UserCheck, ArrowLeft, Info, CheckCircle2, CheckCircle } from 'lucide-react';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '' });
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.data.event);
      setIsRegistered(res.data.isRegistered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setEmailError("");

    if (!regForm.email.includes('@')) {
      setEmailError("Invalid email. An '@' symbol is required.");
      return;
    }

    try {
      await api.post(`/events/${id}/register`, regForm);
      setIsRegisterModalOpen(false);
      setIsRegistered(true);
      setIsSuccessModalOpen(true);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to register');
    }
  };

  if (loading) return <div className="min-h-screen bg-dark-900 flex items-center justify-center">Loading Details...</div>;
  if (!event) return <div className="min-h-screen bg-dark-900 flex items-center justify-center">Event not found.</div>;

  const isEnded = event.end_date && new Date(event.end_date) < new Date();

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <div className="bg-dark-850 border-b border-dark-700 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-dark-700 rounded-full transition-colors text-gray-400"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-100">{event.title}</h1>
            <p className="text-xs text-gray-400 font-semibold tracking-wide uppercase">Event Details</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-dark-850 rounded-2xl border border-dark-700 p-6 md:p-8 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-100">{event.title}</h2>
            <span className={`px-3 py-1 ${isEnded ? 'bg-dark-800 text-gray-400' : 'bg-lime-100 text-lime-700'} rounded-full text-xs font-bold uppercase tracking-wider`}>
              {isEnded ? 'ENDED' : 'LIVE'}
            </span>
          </div>

          {event.image && (
            <div className="mb-6 rounded-2xl overflow-hidden w-full max-h-96 bg-dark-800 border border-dark-700">
              <img src={event.image} alt={event.title} className="w-full h-full object-contain" />
            </div>
          )}
          
          <div className="flex items-center gap-6 text-sm text-gray-400 mb-8 border-b border-dark-700 pb-6">
            <div className="flex items-center gap-2">
              <Calendar className="text-lime-400" size={18} />
              <span className="font-medium"><strong className="text-gray-300">Starts:</strong> {new Date(event.event_date).toLocaleString()}</span>
            </div>
            {event.end_date && (
              <div className="flex items-center gap-2">
                <Calendar className="text-red-500" size={18} />
                <span className="font-medium"><strong className="text-gray-300">Ends:</strong> {new Date(event.end_date).toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-gray-100 flex items-center gap-2">
              <Info size={18} className="text-lime-400"/> About This Event
            </h3>
            <div className="text-gray-400 leading-relaxed text-sm prose max-w-none" dangerouslySetInnerHTML={{ __html: event.description }}></div>
          </div>
        </div>

        {/* Registration Section */}
        <div className="bg-dark-850 rounded-2xl border border-dark-700 p-6 md:p-8 shadow-sm text-center">
          {isRegistered ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-lime-100 text-lime-400 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-100">You're Registered!</h3>
              <p className="text-gray-400 text-sm">We have successfully recorded your registration for this event.</p>
            </div>
          ) : isEnded ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-dark-800 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-2">
                <Info size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-100">Registration Closed</h3>
              <p className="text-gray-400 text-sm">This event has already ended.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-100">Interested in joining?</h3>
              <p className="text-gray-400 text-sm mb-4">Secure your spot for this event by registering now.</p>
              <button 
                onClick={() => {
                  setRegForm({ name: '', email: '', phone: '' });
                  setEmailError("");
                  setIsRegisterModalOpen(true);
                }}
                className="bg-lime-500 hover:bg-lime-600 text-white px-8 py-3 rounded-xl font-bold shadow-sm transition-colors inline-flex items-center gap-2"
              >
                <UserCheck size={18} /> Register for Event
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Registration Form Modal */}
      <Modal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} title="Event Registration">
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-xs font-semibold flex items-start gap-2 border border-yellow-200">
            <Info size={16} className="mt-0.5 shrink-0" />
            <p>Please use your original email. A security code will be sent to this email which is required to log into the event exam.</p>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase">Full Name <span className="text-red-500 ml-1">*</span></label>
            <input 
              type="text" 
              required 
              value={regForm.name} 
              onChange={e => setRegForm({...regForm, name: e.target.value})} 
              className="w-full px-4 py-2 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:border-lime-500 transition-colors" 
              placeholder="e.g. John Doe"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase">Email Address <span className="text-red-500 ml-1">*</span></label>
            <input 
              type="text" 
              required 
              value={regForm.email} 
              onChange={e => {
                setRegForm({...regForm, email: e.target.value});
                if(emailError) setEmailError("");
              }} 
              className={`w-full px-4 py-2 bg-dark-900 border rounded-xl text-sm focus:outline-none transition-colors ${emailError ? 'border-red-500 focus:border-red-500' : 'border-dark-700 focus:border-lime-500'}`} 
              placeholder="johndoe@example.com"
            />
            {emailError && <p className="text-red-500 text-xs font-bold mt-1">{emailError}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase">Phone Number <span className="text-red-500 ml-1">*</span></label>
            <input 
              type="tel" 
              required 
              value={regForm.phone} 
              onChange={e => setRegForm({...regForm, phone: e.target.value})} 
              className="w-full px-4 py-2 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:border-lime-500 transition-colors" 
              placeholder="+8801XXXXXXXXX"
            />
          </div>

          <div className="pt-2">
            <button type="submit" className="w-full py-2.5 bg-lime-500 text-white rounded-xl font-bold hover:bg-lime-600 transition-colors shadow-sm">
              Submit Registration
            </button>
          </div>
        </form>
      </Modal>

      {/* Success Modal */}
      <Modal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)}>
        <div className="py-6 text-center space-y-4">
          <div className="w-20 h-20 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle size={40} className="text-lime-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-100">Registration Successful!</h2>
          <p className="text-gray-400 max-w-sm mx-auto">
            Please check your email. A <strong>security code</strong> has been sent to <span className="font-semibold text-gray-100">{regForm.email}</span>. You will need this code to login to the event exam.
          </p>
          <button 
            onClick={() => setIsSuccessModalOpen(false)} 
            className="mt-6 px-8 py-2.5 bg-dark-800 text-gray-200 font-bold rounded-xl hover:bg-dark-600 transition-colors"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default EventDetails;
