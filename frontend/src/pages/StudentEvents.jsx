import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, UserCheck, Play } from 'lucide-react';
import api from '../api/axiosConfig';
import Modal from '../components/Modal';

const StudentEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
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

  const handleRegister = async () => {
    try {
      await api.post(`/events/${selectedEventId}/register`);
      setIsRegisterModalOpen(false);
      alert('Registered successfully!');
      // Assuming we need to refetch or navigate
      // Wait, we can navigate to details page or just refetch
      navigate(`/event/${selectedEventId}`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to register');
      setIsRegisterModalOpen(false);
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
                      onClick={(e) => { e.stopPropagation(); setSelectedEventId(evt._id); setIsRegisterModalOpen(true); }}
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

      <Modal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} title="Confirm Registration">
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">Are you sure you want to register for this event?</p>
          <div className="flex gap-4">
            <button onClick={() => setIsRegisterModalOpen(false)} className="flex-1 py-2 border border-gray-200 rounded-xl font-bold">Cancel</button>
            <button onClick={handleRegister} className="flex-1 py-2 bg-tomato-500 text-white rounded-xl font-bold hover:bg-tomato-600 transition-colors">Confirm</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudentEvents;
