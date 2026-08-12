import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import Modal from '../components/Modal';
import { Calendar, Clock, UserCheck, ArrowLeft, Info, CheckCircle2 } from 'lucide-react';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

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

  const handleRegister = async () => {
    try {
      await api.post(`/events/${id}/register`);
      setIsRegisterModalOpen(false);
      setIsRegistered(true);
      alert('Registered successfully!');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to register');
      setIsRegisterModalOpen(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading Details...</div>;
  if (!event) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Event not found.</div>;

  const isEnded = event.end_date && new Date(event.end_date) < new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-dark-900">{event.title}</h1>
            <p className="text-xs text-gray-500 font-semibold tracking-wide uppercase">Event Details</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-150 p-6 md:p-8 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-dark-900">{event.title}</h2>
            <span className={`px-3 py-1 ${isEnded ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'} rounded-full text-xs font-bold uppercase tracking-wider`}>
              {isEnded ? 'ENDED' : 'LIVE'}
            </span>
          </div>

          {event.image && (
            <div className="mb-6 rounded-2xl overflow-hidden w-full max-h-96 bg-gray-100 border border-gray-200">
              <img src={event.image} alt={event.title} className="w-full h-full object-contain" />
            </div>
          )}
          
          <div className="flex items-center gap-6 text-sm text-gray-600 mb-8 border-b border-gray-150 pb-6">
            <div className="flex items-center gap-2">
              <Calendar className="text-green-500" size={18} />
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
            <h3 className="font-bold text-dark-900 flex items-center gap-2">
              <Info size={18} className="text-tomato-500"/> About This Event
            </h3>
            <div className="text-gray-600 leading-relaxed text-sm prose max-w-none" dangerouslySetInnerHTML={{ __html: event.description }}></div>
          </div>
        </div>

        {/* Registration Section */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 md:p-8 shadow-sm text-center">
          {isRegistered ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-dark-900">You're Registered!</h3>
              <p className="text-gray-500 text-sm">We have successfully recorded your registration for this event.</p>
            </div>
          ) : isEnded ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-2">
                <Info size={32} />
              </div>
              <h3 className="text-xl font-bold text-dark-900">Registration Closed</h3>
              <p className="text-gray-500 text-sm">This event has already ended.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-dark-900">Interested in joining?</h3>
              <p className="text-gray-500 text-sm mb-4">Secure your spot for this event by registering now.</p>
              <button 
                onClick={() => setIsRegisterModalOpen(true)}
                className="bg-tomato-500 hover:bg-tomato-600 text-white px-8 py-3 rounded-xl font-bold shadow-sm transition-colors inline-flex items-center gap-2"
              >
                <UserCheck size={18} /> Register for Event
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} title="Confirm Registration">
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">Are you sure you want to register for <strong>{event.title}</strong>?</p>
          <div className="flex gap-4">
            <button onClick={() => setIsRegisterModalOpen(false)} className="flex-1 py-2 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-colors text-sm">Cancel</button>
            <button onClick={handleRegister} className="flex-1 py-2 bg-tomato-500 text-white rounded-xl font-bold hover:bg-tomato-600 transition-colors shadow-sm text-sm">Confirm</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EventDetails;
