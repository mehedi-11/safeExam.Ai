import React, { useState, useEffect, useRef } from 'react';
import { Plus, Play, Image as ImageIcon, Edit, Trash2, Search } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import api from '../api/axiosConfig';
import Modal from '../components/Modal';

const EventsManager = ({ isAdmin = false }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  
  const [isRegistrationsModalOpen, setIsRegistrationsModalOpen] = useState(false);
  const [selectedEventRegistrations, setSelectedEventRegistrations] = useState([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [selectedEventTitle, setSelectedEventTitle] = useState("");
  
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    event_date: '', 
    end_date: '', 
    image: '',
    status: 'live'
  });
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

  const fetchRegistrations = async (eventId, eventTitle) => {
    setSelectedEventTitle(eventTitle);
    setIsRegistrationsModalOpen(true);
    setRegistrationsLoading(true);
    try {
      const res = await api.get(`/events/${eventId}/registrations`);
      setSelectedEventRegistrations(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch registrations');
      setSelectedEventRegistrations([]);
    } finally {
      setRegistrationsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingEventId(null);
    setFormData({ title: '', description: '', event_date: '', end_date: '', image: '', status: 'live' });
    setIsModalOpen(true);
  };

  const openEditModal = (evt) => {
    setEditingEventId(evt._id);
    
    const startDate = evt.event_date ? new Date(evt.event_date).toISOString().slice(0, 16) : '';
    const endDate = evt.end_date ? new Date(evt.end_date).toISOString().slice(0, 10) : '';

    setFormData({ 
      title: evt.title, 
      description: evt.description, 
      event_date: startDate, 
      end_date: endDate, 
      image: evt.image || '',
      status: evt.status || 'live'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await api.delete(`/events/${id}`);
      fetchEvents();
    } catch (err) {
      console.error(err);
      alert('Failed to delete event');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let finalEndDate = formData.end_date;
      if (formData.event_date && formData.end_date) {
        const start = new Date(formData.event_date);
        const end = new Date(formData.end_date);
        end.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
        finalEndDate = end.toISOString();
      }

      const payload = { ...formData, end_date: finalEndDate };

      if (editingEventId) {
        await api.put(`/events/${editingEventId}`, payload);
      } else {
        await api.post('/events', payload);
      }
      
      setIsModalOpen(false);
      fetchEvents();
    } catch (err) {
      console.error(err);
      alert(`Failed to ${editingEventId ? 'update' : 'create'} event`);
    }
  };

  const handleToggleStatus = async (evt) => {
    try {
      const newStatus = evt.status === 'live' ? 'closed' : 'live';
      await api.put(`/events/${evt._id}`, { status: newStatus });
      fetchEvents();
    } catch (err) {
      console.error(err);
      alert('Failed to update event status');
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

        const lowQualityImage = canvas.toDataURL('image/jpeg', 0.5);
        setFormData({ ...formData, image: lowQualityImage });
      };
    };
  };

  const filteredEvents = events.filter((evt) => {
    const matchesSearch = evt.title.toLowerCase().includes(searchQuery.toLowerCase());

    const expired = evt.end_date && new Date() > new Date(evt.end_date);
    const isActive = evt.status === 'live' && !expired;

    let matchesFilter = false;
    if (eventFilter === "all") matchesFilter = true;
    else if (eventFilter === "live") matchesFilter = isActive;
    else if (eventFilter === "closed") matchesFilter = !isActive;

    return matchesSearch && matchesFilter;
  });

  if (loading) return <div className="text-center py-10">Loading Events...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-6">
          <h3 className="text-lg font-bold text-dark-900">
            Manage Events
          </h3>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setEventFilter("all")}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${eventFilter === "all" ? "bg-white text-dark-900 shadow-sm" : "text-gray-500 hover:text-dark-900"}`}
            >
              All Events
            </button>
            <button
              onClick={() => setEventFilter("live")}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1 ${eventFilter === "live" ? "bg-white text-dark-900 shadow-sm" : "text-gray-500 hover:text-dark-900"}`}
            >
              {eventFilter === "live" && (
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              )}
              Active
            </button>
            <button
              onClick={() => setEventFilter("closed")}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${eventFilter === "closed" ? "bg-white text-dark-900 shadow-sm" : "text-gray-500 hover:text-dark-900"}`}
            >
              Inactive
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-tomato-500 w-64"
            />
            <Search
              className="absolute left-3 top-2.5 text-gray-400"
              size={16}
            />
          </div>
          {!isAdmin && (
            <button
              onClick={openCreateModal}
              className="tomato-btn py-2 text-xs flex items-center gap-1"
            >
              <Plus size={14} />
              <span>Create Event</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-3 px-4 font-bold text-xs text-gray-400 uppercase tracking-widest">
                Image
              </th>
              <th className="py-3 px-4 font-bold text-xs text-gray-400 uppercase tracking-widest">
                Event Title
              </th>
              <th className="py-3 px-4 font-bold text-xs text-gray-400 uppercase tracking-widest">
                Date & Time
              </th>
              <th className="py-3 px-4 font-bold text-xs text-gray-400 uppercase tracking-widest text-center">
                Registrations
              </th>
              <th className="py-3 px-4 font-bold text-xs text-gray-400 uppercase tracking-widest">
                Status
              </th>
              <th className="py-3 px-4 font-bold text-xs text-gray-400 uppercase tracking-widest text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  className="py-8 text-center text-xs text-gray-400"
                >
                  No events found.
                </td>
              </tr>
            ) : (
              filteredEvents.map((evt) => {
                const expired = evt.end_date && new Date() > new Date(evt.end_date);
                const isActive = evt.status === 'live' && !expired;

                return (
                <tr
                  key={evt._id}
                  className="border-b border-gray-100 hover:bg-gray-50/50"
                >
                  <td className="py-3 px-4">
                    {evt.image ? (
                      <img src={evt.image} alt={evt.title} className="w-16 h-12 rounded object-cover border border-gray-200" />
                    ) : (
                      <div className="w-16 h-12 rounded bg-gray-100 flex items-center justify-center border border-gray-200">
                        <ImageIcon size={16} className="text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-bold text-sm text-dark-900">
                    {evt.title}
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-600">
                    {new Date(evt.event_date).toLocaleString()}
                    {evt.end_date && (
                      <>
                        <br />
                        <span className="text-gray-400">
                          Ends: {new Date(evt.end_date).toLocaleString()}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button 
                      onClick={() => fetchRegistrations(evt._id, evt.title)}
                      className="inline-flex items-center justify-center px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title="View Registrations"
                      disabled={!evt.registration_count}
                    >
                      {evt.registration_count || 0}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <button
                        onClick={() => {
                          if (expired) {
                            alert("Cannot activate an expired event. Please update the end date first.");
                            return;
                          }
                          handleToggleStatus(evt);
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          isActive ? 'bg-tomato-500' : 'bg-gray-300'
                        } ${expired ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={expired ? 'Event has expired' : `Toggle to ${isActive ? 'Inactive' : 'Active'}`}
                      >
                        <span className="sr-only">Toggle status</span>
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`ml-2 text-xs font-bold uppercase tracking-wider ${isActive ? 'text-tomato-600' : 'text-gray-500'}`}>
                        {expired ? 'Expired' : isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    {!isAdmin && (
                      <button
                        onClick={() => openEditModal(evt)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Event"
                      >
                        <Edit size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(evt._id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Event"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )})
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEventId ? "Edit Event" : "Create Event"} maxWidth="max-w-[70%]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Event Title <span className="text-red-500 ml-1">*</span></label>
            <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500 smooth-transition" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Event Description</label>
            <ReactQuill theme="snow" value={formData.description} onChange={(val) => setFormData({...formData, description: val})} className="bg-white rounded-xl quill-large" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Start Date & Time <span className="text-red-500 ml-1">*</span></label>
              <input type="datetime-local" required value={formData.event_date} onChange={e => setFormData({...formData, event_date: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500 smooth-transition" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">End Date <span className="text-red-500 ml-1">*</span></label>
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
          <button type="submit" className="tomato-btn w-full py-2.5 mt-2">{editingEventId ? "Update Event" : "Save Event"}</button>
        </form>
      </Modal>

      {/* Registrations Modal */}
      <Modal 
        isOpen={isRegistrationsModalOpen} 
        onClose={() => setIsRegistrationsModalOpen(false)} 
        title={`Registrations: ${selectedEventTitle}`} 
        maxWidth="max-w-4xl"
      >
        <div className="overflow-x-auto">
          {registrationsLoading ? (
            <div className="text-center py-10 text-gray-500 font-medium">Loading registrations...</div>
          ) : selectedEventRegistrations.length === 0 ? (
            <div className="text-center py-10 text-gray-500 font-medium bg-gray-50 rounded-xl border border-dashed border-gray-200">No registrations found.</div>
          ) : (
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden border border-gray-200 sm:rounded-xl">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider sm:pl-6">Name</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {selectedEventRegistrations.map((reg) => (
                      <tr key={reg._id} className="hover:bg-gray-50 transition-colors">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-semibold text-dark-900 sm:pl-6">{reg.name}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600">{reg.email}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600">{reg.phone || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default EventsManager;
