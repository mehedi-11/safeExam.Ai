import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, UserCheck, CheckCircle, Info } from 'lucide-react';
import api from '../api/axiosConfig';
import Modal from '../components/Modal';

const StudentEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '' });
  const [emailError, setEmailError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.data);
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
      await api.post(`/events/${selectedEventId}/register`, regForm);
      setIsRegisterModalOpen(false);
      setIsSuccessModalOpen(true);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to register');
    }
  };

  if (loading) return <div className="text-center py-10">Loading Events...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-dark-900 flex items-center gap-2">
          <Calendar className="text-tomato-500" /> Upcoming Events
        </h2>
      </div>

      {events.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center text-gray-500">
          No live events available.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((evt) => {
            const isEnded = evt.end_date && new Date(evt.end_date) < new Date();
            return (
              <div key={evt._id} className="card-hover p-6 flex flex-col justify-between h-full bg-white relative cursor-pointer" onClick={() => navigate(`/event/${evt._id}`)}>
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isEnded ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                      {isEnded ? 'ENDED' : 'LIVE'}
                    </span>
                  </div>
                  {evt.image && (
                    <div className="mb-4 rounded-xl overflow-hidden h-32 w-full bg-gray-100 border border-gray-200">
                      <img src={evt.image} alt={evt.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-dark-900 mb-2 line-clamp-2">{evt.title}</h3>
                  <div className="text-sm text-gray-500 mb-4 line-clamp-3 prose prose-sm" dangerouslySetInnerHTML={{ __html: evt.description }}></div>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-sm text-gray-600 gap-2">
                      <Clock size={16} className="text-green-500" />
                      <span><strong className="font-semibold text-gray-700">Starts:</strong> {new Date(evt.event_date).toLocaleString()}</span>
                    </div>
                    {evt.end_date && (
                      <div className="flex items-center text-sm text-gray-600 gap-2">
                        <Clock size={16} className="text-red-500" />
                        <span><strong className="font-semibold text-gray-700">Ends:</strong> {new Date(evt.end_date).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {!isEnded ? (
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedEventId(evt._id); 
                        setRegForm({ name: '', email: '', phone: '' });
                        setEmailError("");
                        setIsRegisterModalOpen(true); 
                      }}
                      className="flex-1 bg-tomato-500 hover:bg-tomato-600 text-white py-2 rounded-xl text-sm font-bold shadow-sm transition-colors flex justify-center items-center gap-1"
                    >
                      <UserCheck size={14} /> Register Now
                    </button>
                  ) : (
                    <button 
                      className="flex-1 bg-gray-100 text-gray-500 py-2 rounded-xl text-sm font-bold cursor-not-allowed flex justify-center items-center gap-1"
                      disabled
                    >
                      Event Ended
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Registration Form Modal */}
      <Modal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} title="Event Registration">
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-xs font-semibold flex items-start gap-2 border border-yellow-200">
            <Info size={16} className="mt-0.5 shrink-0" />
            <p>Please use your original email. A security code will be sent to this email which is required to log into the event exam.</p>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Full Name</label>
            <input 
              type="text" 
              required 
              value={regForm.name} 
              onChange={e => setRegForm({...regForm, name: e.target.value})} 
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500 transition-colors" 
              placeholder="e.g. John Doe"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Email Address</label>
            <input 
              type="text" 
              required 
              value={regForm.email} 
              onChange={e => {
                setRegForm({...regForm, email: e.target.value});
                if(emailError) setEmailError("");
              }} 
              className={`w-full px-4 py-2 bg-gray-50 border rounded-xl text-sm focus:outline-none transition-colors ${emailError ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-tomato-500'}`} 
              placeholder="johndoe@example.com"
            />
            {emailError && <p className="text-red-500 text-xs font-bold mt-1">{emailError}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Phone Number</label>
            <input 
              type="tel" 
              required 
              value={regForm.phone} 
              onChange={e => setRegForm({...regForm, phone: e.target.value})} 
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500 transition-colors" 
              placeholder="+8801XXXXXXXXX"
            />
          </div>

          <div className="pt-2">
            <button type="submit" className="w-full py-2.5 bg-tomato-500 text-white rounded-xl font-bold hover:bg-tomato-600 transition-colors shadow-sm">
              Submit Registration
            </button>
          </div>
        </form>
      </Modal>

      {/* Success Modal */}
      <Modal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)}>
        <div className="py-6 text-center space-y-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-dark-900">Registration Successful!</h2>
          <p className="text-gray-600 max-w-sm mx-auto">
            Please check your email. A <strong>security code</strong> has been sent to <span className="font-semibold text-dark-900">{regForm.email}</span>. You will need this code to login to the event exam.
          </p>
          <button 
            onClick={() => {
              setIsSuccessModalOpen(false);
              navigate(`/event/${selectedEventId}`);
            }} 
            className="mt-6 px-8 py-2.5 bg-gray-100 text-gray-800 font-bold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Go to Event Details
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default StudentEvents;
