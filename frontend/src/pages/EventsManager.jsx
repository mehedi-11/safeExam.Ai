import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Plus, Clock, Users, Play, Image as ImageIcon } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import api from '../api/axiosConfig';
import Modal from '../components/Modal';

const EventsManager = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', event_date: '', end_date: '', image: '' });
  const fileInputRef = useRef(null);

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

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // Set end_date time to match event_date time
      let finalEndDate = formData.end_date;
      if (formData.event_date && formData.end_date) {
        const start = new Date(formData.event_date);
        const end = new Date(formData.end_date);
        end.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
        finalEndDate = end.toISOString();
      }

      await api.post('/events', { ...formData, end_date: finalEndDate });
      setIsModalOpen(false);
      setFormData({ title: '', description: '', event_date: '', end_date: '', image: '' });
      fetchEvents();
    } catch (err) {
      console.error(err);
      alert('Failed to create event');
    }
  };

  const handleMakeLive = async (id) => {
    try {
      await api.put(`/events/${id}/live`);
      fetchEvents();
    } catch (err) {
      console.error(err);
      alert('Failed to make event live');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to low quality JPEG (0.5 quality)
        const lowQualityImage = canvas.toDataURL('image/jpeg', 0.5);
        setFormData({ ...formData, image: lowQualityImage });
      };
    };
  };

  if (loading) return <div className="text-center py-10">Loading Events...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-dark-900 flex items-center gap-2">
          <Calendar className="text-tomato-500" /> My Events
        </h2>
        <button onClick={() => setIsModalOpen(true)} className="tomato-btn">
          <Plus size={18} /> Create Event
        </button>
      </div>

      {events.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center text-gray-500">
          No events created yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((evt) => (
            <div key={evt._id} className="card-hover p-6 flex flex-col justify-between h-full bg-white relative">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    evt.status === 'live' ? 'bg-green-100 text-green-700' : 
                    evt.status === 'draft' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {evt.status}
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
                {evt.status === 'draft' && (
                  <button 
                    onClick={() => handleMakeLive(evt._id)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl text-sm font-bold shadow-sm transition-colors flex justify-center items-center gap-1"
                  >
                    <Play size={14} /> Make Live
                  </button>
                )}
                {/* View details button maybe later */}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Event">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Event Title</label>
            <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500 smooth-transition" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Event Description</label>
            <ReactQuill theme="snow" value={formData.description} onChange={(val) => setFormData({...formData, description: val})} className="bg-white rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Start Date & Time</label>
              <input type="datetime-local" required value={formData.event_date} onChange={e => setFormData({...formData, event_date: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500 smooth-transition" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">End Date</label>
              <input type="date" required value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500 smooth-transition" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Event Image</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${formData.image ? 'border-tomato-500 bg-tomato-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
            >
              {formData.image ? (
                <div className="w-full h-full p-1 relative">
                  <img src={formData.image} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                    <span className="text-white text-sm font-bold">Change Image</span>
                  </div>
                </div>
              ) : (
                <>
                  <ImageIcon size={24} className="text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500 font-medium">Click to upload image</span>
                  <span className="text-xs text-gray-400 mt-1">Auto-compressed for web</span>
                </>
              )}
            </div>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleImageUpload} 
            />
          </div>
          <button type="submit" className="tomato-btn w-full py-2.5 mt-2">Save Event</button>
        </form>
      </Modal>
    </div>
  );
};

export default EventsManager;
