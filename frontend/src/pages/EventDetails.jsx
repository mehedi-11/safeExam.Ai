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
  const [registering, setRegistering] = useState(false);
  
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '' });
  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.data.event);
      setIsRegistered(res.data.isRegistered);
    } catch (err) {
      // Failed to load event details
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

    setRegistering(true);
    try {
      const res = await api.post(`/events/${id}/register`, regForm);
      if (res.data && res.data.success === false) {
        setFormError(res.data.message || 'Already registered with this email');
        return;
      }
      setIsRegisterModalOpen(false);
      setIsRegistered(true);
      setIsSuccessModalOpen(true);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to register');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center">Loading Details...</div>;
  if (!event) return <div className="min-h-screen bg-white flex items-center justify-center">Event not found.</div>;

  const isEnded = event.end_date && new Date(event.end_date) < new Date();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{event.title}</h1>
            <p className="text-xs text-gray-500 font-semibold tracking-wide uppercase">Event Details</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-md shadow-gray-200/50">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{event.title}</h2>
            <span className={`px-3 py-1 ${isEnded ? 'bg-gray-100 text-gray-500' : 'bg-tomato-100 text-tomato-700'} rounded-full text-xs font-bold uppercase tracking-wider`}>
              {isEnded ? 'ENDED' : 'LIVE'}
            </span>
          </div>

          {event.image && (
            <div className="mb-6 rounded-2xl overflow-hidden w-full max-h-96 bg-gray-100 border border-gray-200">
              <img src={event.image} alt={event.title} className="w-full h-full object-contain" />
            </div>
          )}
          
          <div className="flex items-center gap-6 text-sm text-gray-500 mb-8 border-b border-gray-200 pb-6">
            <div className="flex items-center gap-2">
              <Calendar className="text-tomato-400" size={18} />
              <span className="font-medium"><strong className="text-gray-700">Starts:</strong> {new Date(event.event_date).toLocaleString()}</span>
            </div>
            {event.end_date && (
              <div className="flex items-center gap-2">
                <Calendar className="text-red-500" size={18} />
                <span className="font-medium"><strong className="text-gray-700">Ends:</strong> {new Date(event.end_date).toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Info size={18} className="text-tomato-400"/> About This Event
            </h3>
            <div className="text-gray-500 leading-relaxed text-sm prose max-w-none" dangerouslySetInnerHTML={{ __html: event.description }}></div>
          </div>
        </div>

        {/* Registration Section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-md shadow-gray-200/50 text-center">
          {isRegistered ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-tomato-100 text-tomato-400 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">You're Registered!</h3>
              <p className="text-gray-500 text-sm">We have successfully recorded your registration for this event.</p>
            </div>
          ) : isEnded ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Info size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Registration Closed</h3>
              <p className="text-gray-500 text-sm">This event has already ended.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">Interested in joining?</h3>
              <p className="text-gray-500 text-sm mb-4">Secure your spot for this event by registering now.</p>
              <button 
                onClick={() => {
                  const userStr = localStorage.getItem('user');
                  let userName = '', userEmail = '';
                  if (userStr) {
                    try {
                      const user = JSON.parse(userStr);
                      userName = user.name || '';
                      userEmail = user.email || '';
                    } catch (e) {}
                  }
                  setRegForm({ name: userName, email: userEmail, phone: '' });
                  setEmailError("");
                  setFormError("");
                  setIsRegisterModalOpen(true);
                }}
                className="bg-gray-900 hover:bg-black shadow-md hover:shadow-lg shadow-tomato-500/10 hover:shadow-tomato-500/30 transition-all text-white px-8 py-3 rounded-xl font-bold shadow-md shadow-gray-200/50 transition-colors inline-flex items-center gap-2"
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
          <div className="bg-blue-50 text-blue-900 p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 border border-blue-200">
            <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
            <p>Confirm your registration. Once registered, your entry and exam Secret Code will appear in the <strong>"Registered Events"</strong> tab under the Events page.</p>
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
              className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-xl text-sm cursor-not-allowed text-gray-500 focus:outline-none" 
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
              className={`w-full px-4 py-2 bg-gray-100 border rounded-xl text-sm cursor-not-allowed text-gray-500 focus:outline-none transition-colors ${emailError ? 'border-red-500 focus:border-red-500' : 'border-gray-200'}`} 
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
            <button 
              type="submit" 
              disabled={registering}
              className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors shadow-md shadow-gray-200/50 flex items-center justify-center gap-2"
            >
              {registering ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting Registration...</span>
                </>
              ) : (
                <span>Submit Registration</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Success Modal */}
      <Modal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)}>
        <div className="py-6 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={36} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Registration Confirmed!</h2>
          <p className="text-gray-600 text-sm max-w-sm mx-auto">
            Your registration is complete! You can find this event, the exam schedule, and the <strong>Secret Code</strong> in your <strong>"Registered Events"</strong> tab.
          </p>
          <div className="flex gap-3 justify-center pt-3">
            <button 
              onClick={() => {
                setIsSuccessModalOpen(false);
                navigate('/events');
              }} 
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-xs shadow-md shadow-emerald-500/20"
            >
              Go to Registered Events Tab
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EventDetails;
