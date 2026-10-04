import React, { useState, useEffect } from "react";
import WelcomeHeader from "../components/WelcomeHeader";
import { useNavigate } from "react-router-dom";
import api, { API_BASE_URL } from "../api/axiosConfig";
import {
  BookOpen,
  Plus,
  Calendar,
  Clock,
  FileQuestion,
  Trash2,
  Check,
  Camera,
  AlertCircle,
  RefreshCw,
  Download,
  Trash,
  Award,
  Menu,
  LogOut,
  Edit,
  Play,
  ShieldAlert, ShieldCheck,
  FileText,
  Activity,
  Users,
  User,
  X,
  Settings,
  MapPin,
  Key,
  Eye,
  EyeOff,
  KeyRound,
  LayoutDashboard,
  Search,
  GripVertical,
} from "lucide-react";
import Modal from "../components/Modal";
import Loader from "../components/Loader";
import EventsManager from "./EventsManager";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [proctoringSearchQuery, setProctoringSearchQuery] = useState("");
  const [examFilter, setExamFilter] = useState("all");
  const [examCategoryFilter, setExamCategoryFilter] = useState("academic");

  const [exams, setExams] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [proctoringLogs, setProctoringLogs] = useState([]);
  const [rawLogs, setRawLogs] = useState("");
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    profile_image: "",
    joining_date: "",
  });

  // Question Management State
  const [selectedExamId, setSelectedExamId] = useState("");
  const [questions, setQuestions] = useState([]);

  // Results State
  const [selectedResultExamId, setSelectedResultExamId] = useState("");
  const [examResults, setExamResults] = useState([]);
  const [selectedStudentForAnswers, setSelectedStudentForAnswers] =
    useState(null);
  const [studentAnswers, setStudentAnswers] = useState([]);
  const [manualGrades, setManualGrades] = useState({});

  // Proctor Logs State
  const [selectedLogExamId, setSelectedLogExamId] = useState("");
  const [examStudents, setExamStudents] = useState([]);

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isManageQuestionsModalOpen, setIsManageQuestionsModalOpen] =
    useState(false);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [isAnswersModalOpen, setIsAnswersModalOpen] = useState(false);
  const [isNoQuestionsModalOpen, setIsNoQuestionsModalOpen] = useState(false);
  const [isStopExamModalOpen, setIsStopExamModalOpen] = useState(false);
  const [examToStopId, setExamToStopId] = useState(null);
  
  const [isRegistrationsModalOpen, setIsRegistrationsModalOpen] = useState(false);
  const [selectedEventRegistrations, setSelectedEventRegistrations] = useState([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [selectedEventTitle, setSelectedEventTitle] = useState("");

  // Forms
  const [examForm, setExamForm] = useState({
    id: null,
    title: "",
    exam_date: "",
    duration_minutes: "",
    must_on_camera: true,
    must_on_microphone: true,
    course_name: "",
    course_code: "",
    university_name: "",
    max_attempts: 1,
    event_id: "",
    exam_password: "",
  });
  const [isEditingExam, setIsEditingExam] = useState(false);

  const [questionTab, setQuestionTab] = useState("MCQ");
  const [questionForm, setQuestionForm] = useState({
    id: null,
    question_text: "",
    marks: 1,
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_option: "A",
  });
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);

  const [liveForm, setLiveForm] = useState({ password: "" });

  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileDob, setProfileDob] = useState("");
  const [profileUniversity, setProfileUniversity] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [profileYearsOfExperience, setProfileYearsOfExperience] = useState("");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Password Change State
  const [pwData, setPwData] = useState({ oldPassword: "", newPassword: "" });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Axios Instance with JWT auth is now centralized in api

  useEffect(() => {
    if (!token) {
      navigate("/login/teacher");
      return;
    }
    fetchData();
    const timer = setInterval(() => {
      fetchProctoringData();
    }, 4000);
    return () => clearInterval(timer);
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [eRes, pRes, evRes] = await Promise.all([
        api.get("/teacher/exams"),
        api.get("/teacher/profile"),
        api.get("/events").catch(() => ({ data: [] })),
      ]);

      setExams(eRes.data);
      setProfile(pRes.data);
      setProfileName(pRes.data.name);
      setProfileEmail(pRes.data.email);
      setProfileDob(pRes.data.dob ? new Date(pRes.data.dob).toISOString().split('T')[0] : "");
      setProfileUniversity(pRes.data.university || "");
      setProfileAddress(pRes.data.address || "");
      setProfileYearsOfExperience(pRes.data.years_of_experience || "");
      setEventsList(evRes.data || []);

      await fetchProctoringData();
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.clear();
        navigate("/login/teacher");
      } else {
        setError("Failed to fetch dashboard data.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProctoringData = async () => {
    try {
      const [lRes, rRes] = await Promise.all([
        api.get("/teacher/proctoring-logs").catch((err) => {
          return { data: [] };
        }),
        api.get("/proctor/raw-logs").catch((err) => {
          return { data: { logs: "Error loading raw logs." } };
        }),
      ]);
      setProctoringLogs(lRes.data || []);
      setRawLogs(rRes.data?.logs || "");
    } catch (err) {
      // Silently ignore polling errors to prevent console spam
    }
  };

  const fetchExamStudents = async (examId) => {
    setLoading(true);
    try {
      const res = await api.get(`/teacher/exams/${examId}/students`);
      setExamStudents(res.data);
    } catch (err) {
      setError("Error fetching exam students");
    } finally {
      setLoading(false);
    }
  };

  const triggerSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => {
      setSuccess("");
    }, 3000);
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

  // --- Profile Upload Action ---
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const formData = new FormData();
    formData.append("name", profileName);
    formData.append("email", profileEmail);
    formData.append("dob", profileDob);
    formData.append("university", profileUniversity);
    formData.append("address", profileAddress);
    formData.append("years_of_experience", profileYearsOfExperience);
    if (profileImageFile) {
      formData.append("profile_image", profileImageFile);
    }

    try {
      const res = await api.put("/teacher/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      triggerSuccess("Profile updated successfully");
      setProfile(res.data.user);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setIsProfileModalOpen(false);
    } catch (err) {
      setError("Error updating profile details.");
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.put("/teacher/change-password", pwData);
      triggerSuccess("Password changed successfully");
      setPwData({ oldPassword: "", newPassword: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Error changing password.");
    }
  };

  // --- Exam Actions ---
  const handleSaveExam = async (e) => {
    e.preventDefault();
    try {
      if (isEditingExam) {
        await api.put(`/teacher/exams/${examForm.id}`, examForm);
        triggerSuccess("Exam updated successfully");
        setIsExamModalOpen(false);
        fetchData();
      } else {
        const res = await api.post("/teacher/exams", examForm);
        triggerSuccess("Exam scheduled successfully");
        setIsExamModalOpen(false);
        fetchData();
        setSelectedExamId(res.data.examId);
        fetchQuestions(res.data.examId);
        setIsManageQuestionsModalOpen(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error saving exam");
    }
  };

  const handleDeleteExam = async (id) => {
    if (
      !window.confirm(
        "Delete this exam? This will wipe all its questions and grades.",
      )
    )
      return;
    try {
      await api.delete(`/teacher/exams/${id}`);
      triggerSuccess("Exam deleted");
      fetchData();
      if (selectedExamId === id) {
        setQuestions([]);
        setSelectedExamId("");
      }
      if (selectedResultExamId === id) {
        setExamResults([]);
        setSelectedResultExamId("");
      }
    } catch (err) {
      setError("Error deleting exam");
    }
  };

  const handleMakeLiveSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/teacher/exams/${examForm.id}/live`, {
        is_live: true,
        exam_password: liveForm.password,
      });
      setIsLiveModalOpen(false);
      triggerSuccess("Exam is now Live!");
      fetchData();
    } catch (err) {
      if (err.response?.data?.no_questions) {
        setIsLiveModalOpen(false);
        setIsNoQuestionsModalOpen(true);
      } else {
        setError(err.response?.data?.message || "Error making exam live");
      }
    }
  };

  const handleStopLive = async (id) => {
    setExamToStopId(id);
    setIsStopExamModalOpen(true);
  };

  const confirmStopLive = async () => {
    if (!examToStopId) return;
    try {
      await api.post(`/teacher/exams/${examToStopId}/live`, {
        is_live: false,
        exam_password: "",
      });
      triggerSuccess("Exam stopped.");
      setIsStopExamModalOpen(false);
      setExamToStopId(null);
      fetchData();
    } catch (err) {
      setError("Error stopping exam");
    }
  };

  // --- Question Actions ---
  const [dragItemIndex, setDragItemIndex] = useState(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState(null);

  // Fetch questions for an exam
  const fetchQuestions = async (examId) => {
    setSelectedExamId(examId);
    try {
      const res = await api.get(`/teacher/exams/${examId}/questions`);
      setQuestions(res.data);
    } catch (err) {
      setError("Error fetching questions");
    }
  };

  const handleSort = async () => {
    if (dragItemIndex === null || dragOverItemIndex === null || dragItemIndex === dragOverItemIndex) {
      setDragItemIndex(null);
      setDragOverItemIndex(null);
      return;
    }

    const items = Array.from(questions);
    const [reorderedItem] = items.splice(dragItemIndex, 1);
    items.splice(dragOverItemIndex, 0, reorderedItem);

    setQuestions(items);
    setDragItemIndex(null);
    setDragOverItemIndex(null);

    const ordered_ids = items.map((item) => item.id);

    try {
      await api.put(
        `/teacher/exams/${selectedExamId}/questions/reorder`,
        { ordered_ids }
      );
    } catch (err) {
      console.error("Failed to reorder questions", err);
      fetchQuestions(selectedExamId);
      setError("Failed to save new order.");
    }
  };



  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...questionForm,
        exam_id: selectedExamId,
        type: questionTab,
      };

      if (isEditingQuestion) {
        await api.put(`/teacher/questions/${questionForm.id}`, payload);
        triggerSuccess("Question updated");
      } else {
        await api.post("/teacher/questions", payload);
        triggerSuccess("Question added");
      }
      setIsQuestionModalOpen(false);
      fetchQuestions(selectedExamId);
      fetchData(); // Reload counts
    } catch (err) {
      setError(err.response?.data?.message || "Error saving question");
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await api.delete(`/teacher/questions/${id}`);
      triggerSuccess("Question deleted");
      fetchQuestions(selectedExamId);
      fetchData();
    } catch (err) {
      setError("Error deleting question");
    }
  };

  // --- Exam Results Actions ---
  const fetchExamResults = async (examId) => {
    setSelectedResultExamId(examId);
    try {
      const res = await api.get(`/teacher/exams/${examId}/results`);
      setExamResults(res.data);
    } catch (err) {
      setError("Error fetching exam results");
    }
  };

  const handleTogglePublishResults = async (examId, currentStatus) => {
    try {
      await api.put(`/teacher/exams/${examId}/publish`, { results_published: !currentStatus });
      triggerSuccess(`Exam results ${!currentStatus ? 'published' : 'unpublished'} successfully!`);
      fetchData(); 
    } catch (err) {
      setError("Error updating publish status");
    }
  };

  const handleViewAnswers = async (studentId, studentName) => {
    setSelectedStudentForAnswers({ id: studentId, name: studentName });
    setManualGrades({});
    try {
      const res = await api.get(
        `/teacher/exams/${selectedResultExamId}/students/${studentId}/answers`,
      );
      setStudentAnswers(res.data);
      setIsAnswersModalOpen(true);
    } catch (err) {
      setError("Error fetching student answers");
    }
  };

  const handleManualGradeSubmit = async () => {
    try {
      const res = await api.post(
        `/teacher/exams/${selectedResultExamId}/students/${selectedStudentForAnswers.id}/grade/manual`,
        {
          grades: manualGrades,
        },
      );
      triggerSuccess(`Manual grading saved. Total Score: ${res.data.score}`);
      setIsAnswersModalOpen(false);
      fetchExamResults(selectedResultExamId);
    } catch (err) {
      setError("Error saving manual grades");
    }
  };

  // Raw download file
  const downloadLogs = () => {
    const blob = new Blob([rawLogs], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "cheating_activity_report.log");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearLogs = async () => {
    if (
      !window.confirm(
        "Are you sure you want to permanently clear the proctoring log file?",
      )
    )
      return;
    try {
      await api.delete("/proctor/raw-logs");
      setRawLogs("");
      triggerSuccess("Logs cleared successfully.");
    } catch (err) {
      setError("Error clearing logs");
    }
  };

  const downloadProctoringData = async (examId, type) => {
    try {
      if (type === 'logs') {
        const response = await api.get(`/teacher/exams/${examId}/logs/download`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `exam_${examId}_logs.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else if (type === 'roster') {
        const res = await api.get(`/teacher/exams/${examId}/students`);
        const students = res.data;
        if (!students || students.length === 0) {
          setError("No students found for this exam.");
          return;
        }
        
        let csvContent = "Student ID,Name,Email,Score,Status\n";
        students.forEach(student => {
          csvContent += `"${student.student_id || ''}","${student.name || ''}","${student.email || ''}","${student.score || 0}","${student.status || ''}"\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `exam_${examId}_roster.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      console.error(err);
      setError(`Failed to download ${type}`);
    }
  };

  return (
    <div className="min-h-screen bg-dark-850 flex flex-col lg:flex-row">
      {loading && <Loader />}

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between bg-dark-850 border-b border-dark-700 p-4 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-lime-500 flex items-center justify-center text-dark-900 font-extrabold text-sm">
            <BookOpen size={16} />
          </div>
          <span className="font-extrabold text-md text-black">
            SExam<span className="text-lime-400">.AI</span>
          </span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 border border-dark-700 rounded-lg text-gray-400 hover:bg-dark-800 transition-colors"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div
        className={`fixed inset-y-0 left-0 bg-dark-850 border-r border-dark-700 w-64 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static flex flex-col justify-between shrink-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo and Menu Links */}
        <div>
          {/* Brand Logo Header */}
          <div className="p-6 border-b border-dark-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-lime-500 flex items-center justify-center text-dark-900 shadow-lg shadow-lime-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-gray-100">
                SExam<span className="text-lime-400">.AI</span>
              </span>
              <span className="text-[10px] text-gray-400 block font-semibold tracking-widest uppercase">
                Teacher Console
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-4 space-y-1.5">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "add_exam", label: "Manage Exams", icon: FileText },
              { id: "exam_results", label: "Exam Results", icon: Award },
              { id: "events", label: "Events", icon: Calendar },
              { id: "proctoring", label: "Proctoring", icon: Camera },
              { id: "profile", label: "My Profile", icon: User },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setError("");
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 font-semibold text-sm rounded-xl transition-all ${
                  activeTab === tab.id
                    ? "bg-lime-500 text-white shadow-lg shadow-lime-500/20 animate-fade-in"
                    : "text-gray-400 hover:text-gray-100 hover:bg-dark-700"
                }`}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-dark-700 space-y-4">
          <div className="flex items-center gap-3 px-2">
            {profile.profile_image ? (
              <img
                src={`${API_BASE_URL}${profile.profile_image}`}
                alt="Teacher"
                className="w-10 h-10 rounded-full object-cover border border-lime-500 shadow-sm"
                onError={(e) => {
                  e.target.src =
                    "https://api.dicebear.com/7.x/initials/svg?seed=" +
                    profile.name;
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-lime-100 text-lime-400 flex items-center justify-center border border-lime-200 font-extrabold">
                {profile.name ? profile.name.charAt(0).toUpperCase() : "T"}
              </div>
            )}
            <div className="min-w-0">
              <span className="font-bold text-xs text-gray-100 block truncate">
                {profile.name || "Instructor"}
              </span>
              <span className="text-[10px] text-gray-400 font-semibold block truncate">
                {profile.email}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.clear();
              navigate("/");
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dark-700 hover:border-lime-500 hover:bg-lime-50/10 hover:text-lime-400 rounded-xl text-xs font-bold text-gray-400 transition-all active:scale-95"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-grow flex-1 min-w-0 p-3 pb-16 md:p-4 md:pb-4 max-h-screen overflow-y-auto">
        {activeTab === "dashboard" && <WelcomeHeader userName={profile?.name || profileName} />}
        {/* Header Summary Removed */}
        <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-4 mb-6">
          <div className="w-full flex flex-col gap-4">

            
            {activeTab === 'add_exam' && (
              <div className="flex bg-dark-850 border border-dark-700 p-1.5 rounded-xl w-max shadow-sm">
                <button
                  onClick={() => setExamCategoryFilter("academic")}
                  className={`px-8 py-2 text-sm font-bold rounded-lg transition-all ${examCategoryFilter === "academic" ? "bg-lime-50 text-lime-600 shadow-sm scale-100" : "text-gray-400 hover:text-gray-100 scale-95"}`}
                >
                  Academic Exams
                </button>
                <button
                  onClick={() => setExamCategoryFilter("event")}
                  className={`px-8 py-2 text-sm font-bold rounded-lg transition-all ${examCategoryFilter === "event" ? "bg-lime-50 text-lime-600 shadow-sm scale-100" : "text-gray-400 hover:text-gray-100 scale-95"}`}
                >
                  Event Exams
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Global Notifications */}
        {success && (
          <div className="bg-lime-50 border border-lime-200 text-lime-700 py-3 px-5 rounded-xl text-xs font-semibold mb-6 flex items-center gap-2 animate-fade-in shadow-sm">
            <Check size={16} />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 py-3 px-5 rounded-xl text-xs font-semibold mb-6 flex items-center gap-2 animate-fade-in shadow-sm">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Dynamic Panel */}
        <div className="bg-dark-850 rounded-2xl border border-dark-700 p-6 md:p-8 shadow-sm">
          {/* TAB: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-8 animate-fade-in">
              {/* Dashboard Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-dark-850 p-5 rounded-2xl border border-dark-700 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-lime-50 text-lime-400 flex items-center justify-center">
                    <FileText size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Total Exams
                    </p>
                    <h3 className="text-2xl font-extrabold text-gray-100">
                      {exams.length}
                    </h3>
                  </div>
                </div>
                <div className="bg-dark-850 p-5 rounded-2xl border border-dark-700 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-lime-50 text-lime-400 flex items-center justify-center">
                    <FileQuestion size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Total Questions
                    </p>
                    <h3 className="text-2xl font-extrabold text-gray-100">
                      {exams.reduce((sum, e) => sum + e.questions_count, 0)}
                    </h3>
                  </div>
                </div>
                <div className="bg-dark-850 p-5 rounded-2xl border border-dark-700 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-lime-50 text-lime-400 flex items-center justify-center">
                    <Activity size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Submissions
                    </p>
                    <h3 className="text-2xl font-extrabold text-gray-100">
                      {exams.reduce((sum, e) => sum + e.submissions_count, 0)}
                    </h3>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-100 mt-8 mb-4">
                Quick Links
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                  onClick={() => setActiveTab("add_exam")}
                  className="bg-dark-850 p-5 rounded-2xl border border-dark-700 shadow-sm flex items-center gap-4 hover:border-lime-300 transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-lime-50 text-lime-400 flex items-center justify-center shrink-0">
                    <Plus size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-100">Create New Exam</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Set up a new examination with proctoring.
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("exam_results")}
                  className="bg-dark-850 p-5 rounded-2xl border border-dark-700 shadow-sm flex items-center gap-4 hover:border-lime-300 transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-lime-50 text-lime-400 flex items-center justify-center shrink-0">
                    <Award size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-100">View Results</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Check grades and submissions for exams.
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("logs")}
                  className="bg-dark-850 p-5 rounded-2xl border border-dark-700 shadow-sm flex items-center gap-4 hover:border-lime-300 transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                    <ShieldAlert size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-100">Proctor Alerts</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Review live cheating alerts and activity.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* TAB: EVENTS */}
          {activeTab === "events" && (
            <div className="animate-fade-in">
              <EventsManager />
            </div>
          )}

          {/* TAB: ADD EXAM */}
          {activeTab === "add_exam" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full xl:w-auto">
                  <h3 className="text-lg font-bold text-gray-100 whitespace-nowrap">
                    Manage Exams
                  </h3>
                  <div className="flex flex-wrap bg-dark-800 p-1 rounded-lg w-full sm:w-max">
                    <button
                      onClick={() => setExamFilter("all")}
                      className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors flex-1 sm:flex-none text-center ${examFilter === "all" ? "bg-dark-850 text-gray-100 shadow-sm" : "text-gray-400 hover:text-gray-100"}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setExamFilter("live")}
                      className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center justify-center gap-1 flex-1 sm:flex-none ${examFilter === "live" ? "bg-dark-850 text-gray-100 shadow-sm" : "text-gray-400 hover:text-gray-100"}`}
                    >
                      {examFilter === "live" && (
                        <span className="w-1.5 h-1.5 bg-lime-500 rounded-full animate-pulse"></span>
                      )}
                      Live
                    </button>
                    <button
                      onClick={() => setExamFilter("upcoming")}
                      className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors flex-1 sm:flex-none text-center ${examFilter === "upcoming" ? "bg-dark-850 text-gray-100 shadow-sm" : "text-gray-400 hover:text-gray-100"}`}
                    >
                      Upcoming
                    </button>
                    <button
                      onClick={() => setExamFilter("ended")}
                      className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors flex-1 sm:flex-none text-center ${examFilter === "ended" ? "bg-dark-850 text-gray-100 shadow-sm" : "text-gray-400 hover:text-gray-100"}`}
                    >
                      Ended
                    </button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto">
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search exams..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-dark-700 rounded-lg text-sm focus:outline-none focus:border-lime-500 w-full sm:w-64 md:w-72 bg-dark-900 hover:bg-dark-850 transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setExamForm({
                        id: null,
                        title: "",
                        exam_date: "",
                        duration_minutes: "",
                        type: "MCQ",
                        must_on_camera: true,
                        must_on_microphone: true,
                        course_name: "",
                        course_code: "",
                        university_name: "",
                        max_attempts: 1,
                        event_id: "",
                        exam_password: "",
                      });
                      setIsEditingExam(false);
                      setIsExamModalOpen(true);
                    }}
                    className="lime-btn py-2 text-xs flex items-center justify-center gap-1 w-full sm:w-auto"
                  >
                    <Plus size={14} />
                    <span>Create Exam</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dark-700">
                      <th className="py-3 px-4 font-bold text-xs text-lime-800 uppercase tracking-widest">
                        Exam Title
                      </th>
                      <th className="py-3 px-4 font-bold text-xs text-lime-800 uppercase tracking-widest">
                        Course & University
                      </th>
                      <th className="py-3 px-4 font-bold text-xs text-lime-800 uppercase tracking-widest">
                        Date & Time
                      </th>
                      <th className="py-3 px-4 font-bold text-xs text-lime-800 uppercase tracking-widest text-center">
                        Duration
                      </th>
                      <th className="py-3 px-4 font-bold text-xs text-lime-800 uppercase tracking-widest">
                        Status
                      </th>
                      <th className="py-3 px-4 font-bold text-xs text-lime-800 uppercase tracking-widest text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const sq = searchQuery.toLowerCase();
                      const now = new Date();
                      const filteredExams = exams
                        .slice()
                        .sort((a, b) => b.id.localeCompare(a.id))
                        .filter((exam) => {
                          if (examCategoryFilter === "academic" && exam.event_id) return false;
                          if (examCategoryFilter === "event" && !exam.event_id) return false;

                          const matchesSearch =
                            (exam.title &&
                              exam.title.toLowerCase().includes(sq)) ||
                            (exam.university_name &&
                              exam.university_name.toLowerCase().includes(sq)) ||
                            (exam.course_name &&
                              exam.course_name.toLowerCase().includes(sq)) ||
                            (exam.course_code &&
                              exam.course_code.toLowerCase().includes(sq));

                          const examDate = new Date(exam.exam_date);
                          const durationMs = (exam.duration_minutes + 5) * 60000;
                          const expireTime = new Date(
                            examDate.getTime() + durationMs,
                          );

                          let matchesFilter = false;
                          if (examFilter === "all") matchesFilter = true;
                          else if (examFilter === "live")
                            matchesFilter = exam.is_live;
                          else if (examFilter === "upcoming")
                            matchesFilter = now < examDate;
                          else if (examFilter === "ended")
                            matchesFilter = now > expireTime;

                          return matchesSearch && matchesFilter;
                        });
                      if (filteredExams.length === 0) {
                        return (
                          <tr>
                            <td
                              colSpan="6"
                              className="py-8 text-center text-xs text-gray-400"
                            >
                              No exams found.
                            </td>
                          </tr>
                        );
                      }
                      return filteredExams.map((exam) => (
                        <tr
                          key={exam.id}
                          className="border-b border-gray-100 hover:bg-dark-900/50"
                        >
                          <td className="py-3 px-4 font-bold text-sm text-gray-100">
                            {exam.title}
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-400">
                            {exam.course_name}{" "}
                            {exam.course_code ? `(${exam.course_code})` : ""}
                            <br />
                            <span className="text-gray-400">
                              {exam.university_name}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-400">
                            {new Date(exam.exam_date).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-900 border border-dark-700 text-xs font-semibold text-gray-300">
                              <Clock size={12} className="text-gray-400" />
                              {exam.duration_minutes}m
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {exam.is_live ? (
                              <span className="px-2.5 py-1 bg-lime-100 text-lime-700 text-[10px] font-bold rounded-full flex items-center gap-1 w-max">
                                <span className="w-1.5 h-1.5 bg-lime-500 rounded-full animate-pulse"></span>
                                LIVE
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-dark-800 text-gray-400 text-[10px] font-bold rounded-full w-max">
                                OFFLINE
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            {exam.is_live && (
                              <button
                                onClick={() => navigate(`/teacher/proctoring/${exam.id}`)}
                                className="px-3 py-1.5 bg-lime-100 text-lime-700 hover:bg-lime-200 rounded-lg text-xs font-bold transition-colors"
                                title="Proctor Exam"
                              >
                                <ShieldCheck size={14} className="inline mr-1" /> Proctor
                              </button>
                            )}
                            {exam.event_id ? (
                              <span className="text-xs text-gray-400 italic">Auto-starts</span>
                            ) : exam.is_live ? (
                              <button
                                onClick={() => handleStopLive(exam.id)}
                                className="px-3 py-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-xs font-bold transition-colors"
                              >
                                Stop
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  if (!exam.questions_count || exam.questions_count === 0) {
                                    setExamForm({ id: exam.id });
                                    setIsNoQuestionsModalOpen(true);
                                  } else {
                                    setExamForm({ id: exam.id });
                                    setLiveForm({ password: "" });
                                    setIsLiveModalOpen(true);
                                  }
                                }}
                                className="px-3 py-1.5 bg-lime-100 text-lime-700 hover:bg-lime-200 rounded-lg text-xs font-bold flex inline-flex items-center gap-1 transition-colors"
                              >
                                <Play size={12} /> Make Live
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setExamForm({
                                  id: exam.id,
                                  title: exam.title,
                                  exam_date: new Date(exam.exam_date)
                                    .toISOString()
                                    .slice(0, 16),
                                  duration_minutes: exam.duration_minutes,
                                  must_on_camera:
                                    exam.must_on_camera === 1 ||
                                    exam.must_on_camera === true,
                                  must_on_microphone:
                                    exam.must_on_microphone === 1 ||
                                    exam.must_on_microphone === true,
                                  course_name: exam.course_name || "",
                                  course_code: exam.course_code || "",
                                  university_name: exam.university_name || "",
                                  max_attempts: exam.max_attempts || 1,
                                  event_id: exam.event_id || "",
                                  exam_password: exam.exam_password || "",
                                });
                                setIsEditingExam(true);
                                setIsExamModalOpen(true);
                              }}
                              className="p-1.5 text-lime-400 hover:bg-lime-50 rounded-lg transition-colors"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedExamId(exam.id);
                                fetchQuestions(exam.id);
                                setIsManageQuestionsModalOpen(true);
                              }}
                              className="p-1.5 text-lime-400 hover:bg-lime-50 rounded-lg transition-colors"
                              title="Manage Questions"
                            >
                              <FileQuestion size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteExam(exam.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: EXAM RESULTS */}
          {activeTab === "exam_results" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between gap-4 border-b border-dark-700 pb-6 flex-wrap">
                <div className="flex-1 w-full max-w-md">
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-widest mb-2">
                    Select Exam to View Results
                  </label>
                  <select
                    value={selectedResultExamId}
                    onChange={(e) => {
                      if (e.target.value) fetchExamResults(e.target.value);
                      else {
                        setSelectedResultExamId("");
                        setExamResults([]);
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:border-lime-500 transition-colors"
                  >
                    <option value="">-- Choose an Exam --</option>
                    {exams.map((e) => (
                      <option key={e.id} value={e.id}>
                        {[
                          e.university_name,
                          e.course_name,
                          e.course_code,
                          e.title,
                        ]
                          .filter(Boolean)
                          .join(" - ")}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedResultExamId && (() => {
                  const selectedExam = exams.find(e => e.id == selectedResultExamId);
                  if(!selectedExam) return null;
                  const isPublished = selectedExam.results_published;
                  return (
                    <button
                      onClick={() => handleTogglePublishResults(selectedExam.id, isPublished)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                        isPublished 
                        ? "bg-dark-800 text-gray-300 hover:bg-dark-600" 
                        : "bg-lime-500 text-white shadow-md shadow-lime-500/20 hover:bg-lime-600"
                      }`}
                    >
                      {isPublished ? (
                        <>
                          <EyeOff size={16} /> Unpublish Results
                        </>
                      ) : (
                        <>
                          <Eye size={16} /> Publish Results
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>

              {selectedResultExamId ? (
                examResults.length === 0 ? (
                  <div className="border border-dashed border-dark-700 bg-dark-900/50 py-12 rounded-xl text-center text-xs text-gray-400">
                    No students have taken this exam yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-dark-700">
                          <th className="py-3 px-4 font-bold text-xs text-lime-800 uppercase tracking-widest">
                            Student
                          </th>
                          <th className="py-3 px-4 font-bold text-xs text-lime-800 uppercase tracking-widest">
                            Status
                          </th>
                          <th className="py-3 px-4 font-bold text-xs text-lime-800 uppercase tracking-widest">
                            Demerit Points
                          </th>
                          <th className="py-3 px-4 font-bold text-xs text-lime-800 uppercase tracking-widest">
                            Marks
                          </th>
                          <th className="py-3 px-4 font-bold text-xs text-lime-800 uppercase tracking-widest text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {examResults.map((res, index) => (
                          <tr
                            key={res.attempt_id || res.student_id || index}
                            className="border-b border-gray-100 hover:bg-dark-900/50"
                          >
                            <td className="py-3 px-4">
                              <p className="font-bold text-sm text-gray-100">
                                {res.name}
                              </p>
                              <p className="text-[10px] text-gray-400 font-mono">
                                {res.student_id}
                              </p>
                            </td>
                            <td className="py-3 px-4 text-xs">
                              {res.status === "completed" ? (
                                <span className="text-lime-600 font-bold bg-lime-50 px-2 py-1 rounded-lg">
                                  Completed
                                </span>
                              ) : (
                                <span className="text-orange-500 font-bold bg-orange-50 px-2 py-1 rounded-lg capitalize">
                                  {res.status}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {res.demerit_points > 0 ? (
                                <span className="text-red-500 font-bold text-sm">
                                  {res.demerit_points} pts
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">0</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm font-bold text-gray-100">
                              {res.score !== null ? (
                                res.score
                              ) : (
                                <span className="text-gray-400 italic text-xs font-normal">
                                  Pending Review
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              
                              <button
                                onClick={() =>
                                  handleViewAnswers(res.student_id, res.name)
                                }
                                className="px-3 py-1.5 bg-lime-50 text-lime-600 hover:bg-lime-100 rounded-lg text-[11px] font-bold transition-colors"
                              >
                                View Answersheet
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <div className="py-24 text-center text-xs text-gray-400">
                  Please select an exam to view student results.
                </div>
              )}
            </div>
          )}



          {/* TAB: PROFILE SETTINGS */}

          {/* TAB: PROCTORING */}
          {activeTab === "proctoring" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-6">
                  <h3 className="text-lg font-bold text-gray-100">
                    Proctoring & Logs
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search exams..."
                      value={proctoringSearchQuery}
                      onChange={(e) => setProctoringSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-dark-700 rounded-lg text-sm focus:outline-none focus:border-lime-500 w-64"
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dark-700">
                      <th className="py-3 px-4 font-bold text-xs text-lime-800 uppercase tracking-widest">Exam Title</th>
                      <th className="py-3 px-4 font-bold text-xs text-lime-800 uppercase tracking-widest">Course & University</th>
                      <th className="py-3 px-4 font-bold text-xs text-lime-800 uppercase tracking-widest">Date & Time</th>
                      <th className="py-3 px-4 font-bold text-xs text-lime-800 uppercase tracking-widest text-center">Status</th>
                      <th className="py-3 px-4 font-bold text-xs text-lime-800 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                    <tbody className="text-sm">
                      {(() => {
                        const sq = proctoringSearchQuery.toLowerCase();
                        const filteredExams = exams
                          .slice()
                          .sort((a, b) => (b._id || b.id).localeCompare((a._id || a.id)))
                          .filter((exam) => {
                            const matchesSearch =
                              (exam.title && exam.title.toLowerCase().includes(sq)) ||
                              (exam.university_name && exam.university_name.toLowerCase().includes(sq)) ||
                              (exam.course_name && exam.course_name.toLowerCase().includes(sq)) ||
                              (exam.course_code && exam.course_code.toLowerCase().includes(sq));

                            return matchesSearch;
                          });

                        if (filteredExams.length === 0) {
                          return (
                            <tr>
                              <td colSpan="5" className="py-12 text-center text-gray-400">
                                <div className="flex flex-col items-center justify-center space-y-3">
                                  <FileText size={32} className="opacity-20" />
                                  <p>No exams found</p>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return filteredExams.map((exam) => {
                          const examDate = new Date(exam.exam_date);
                          const durationMs = (exam.duration_minutes + 5) * 60000;
                          const expireTime = new Date(examDate.getTime() + durationMs);
                          const now = new Date();

                          const isLive = exam.is_live === true;
                          const isEnded = !isLive && now > expireTime;
                          const eId = exam._id || exam.id;

                          return (
                            <tr key={eId} className="border-b border-gray-100 hover:bg-dark-900/50">
                              <td className="py-3 px-4 font-bold text-sm text-gray-100">
                                {exam.title}
                                {exam.event_id && (
                                  <span className="inline-block mt-1 px-2 py-0.5 bg-lime-50 text-lime-600 rounded text-[10px] font-bold">Event Exam</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-xs text-gray-400">
                                {exam.course_name} {exam.course_code ? `(${exam.course_code})` : ''}
                                <br />
                                <span className="text-gray-400">{exam.university_name}</span>
                              </td>
                              <td className="py-3 px-4 text-xs text-gray-400">
                                <div>{examDate.toLocaleDateString()}</div>
                                <div>{examDate.toLocaleTimeString()}</div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {isLive ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-lime-50 text-lime-600 border border-lime-100 w-max uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 bg-lime-500 rounded-full animate-pulse"></span>
                                    Online
                                  </span>
                                ) : (
                                  <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-bold bg-dark-800 text-gray-400 border border-dark-700 w-max uppercase tracking-wider">
                                    Offline
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right space-x-2">
                                <div className="flex items-center justify-end gap-2">
                                  {isLive && (
                                    <button
                                      onClick={() => navigate(`/teacher/proctoring/${eId}`)}
                                      className="px-3 py-1.5 text-xs font-bold text-lime-600 bg-lime-50 border border-lime-200 rounded-lg hover:bg-lime-100 transition-colors flex items-center gap-1.5"
                                    >
                                      <Camera size={14} />
                                      View Live
                                    </button>
                                  )}
                                  
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => downloadProctoringData(eId, 'logs')}
                                      title="Download Incident Logs"
                                      className="px-2.5 py-1.5 flex items-center justify-center gap-1.5 text-gray-400 hover:text-lime-400 bg-dark-850 border border-dark-700 rounded-lg hover:border-lime-200 transition-colors"
                                    >
                                      <Download size={14} />
                                      <span className="text-[11px] font-bold">Logs</span>
                                    </button>
                                    <button
                                      onClick={() => downloadProctoringData(eId, 'roster')}
                                      title="Download Student Roster"
                                      className="px-2.5 py-1.5 flex items-center justify-center gap-1.5 text-gray-400 hover:text-lime-400 bg-dark-850 border border-dark-700 rounded-lg hover:border-lime-200 transition-colors"
                                    >
                                      <Users size={14} />
                                      <span className="text-[11px] font-bold">Roster</span>
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
              {/* Profile Card with Banner */}
              <div className="bg-dark-850 rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
                
                {/* Gradient Banner */}
                <div className="h-40 w-full bg-gradient-to-r from-lime-500 via-lime-400 to-lime-600 relative">
                  <div className="absolute top-4 right-4">
                    <button
                      type="button"
                      onClick={() => setIsProfileModalOpen(true)}
                      className="px-5 py-2.5 bg-dark-850/20 hover:bg-dark-850/30 text-white backdrop-blur-md text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
                    >
                      <Edit size={16} />
                      Edit Profile
                    </button>
                  </div>
                </div>

                {/* Profile Details Area */}
                <div className="px-8 pb-10 relative">
                  {/* Profile Picture (overlapping banner) */}
                  <div className="absolute -top-16 left-8">
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-dark-850 p-1.5 shadow-xl">
                      <div className="w-full h-full rounded-full overflow-hidden bg-dark-800">
                        {profile.profile_image ? (
                          <img src={"http://localhost:5000" + profile.profile_image} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lime-300 bg-lime-50">
                            <User className="w-16 h-16" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Name and Designation */}
                  <div className="pt-20">
                    <h3 className="text-3xl font-black text-gray-100 tracking-tight">{profileName || "Instructor Name"}</h3>
                    <p className="text-lime-600 font-bold mt-1 uppercase text-sm tracking-wider">Senior Instructor</p>
                  </div>

                  {/* Info Cards Grid */}
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Info Item */}
                    <div className="bg-dark-900 border border-gray-100 p-4 rounded-2xl flex items-center gap-4 hover:border-lime-200 hover:shadow-sm transition-all group">
                      <div className="w-12 h-12 bg-dark-850 rounded-xl flex items-center justify-center text-lime-400 shadow-sm group-hover:scale-110 transition-transform">
                        <Activity size={24} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Email Address</p>
                        <p className="text-sm font-semibold text-gray-100">{profileEmail || "Not provided"}</p>
                      </div>
                    </div>
                    {/* Info Item */}
                    <div className="bg-dark-900 border border-gray-100 p-4 rounded-2xl flex items-center gap-4 hover:border-lime-200 hover:shadow-sm transition-all group">
                      <div className="w-12 h-12 bg-dark-850 rounded-xl flex items-center justify-center text-lime-400 shadow-sm group-hover:scale-110 transition-transform">
                        <Calendar size={24} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Date of Birth</p>
                        <p className="text-sm font-semibold text-gray-100">
                          {profileDob ? new Date(profileDob).toLocaleDateString() : "Not provided"}
                        </p>
                      </div>
                    </div>
                    {/* Info Item */}
                    <div className="bg-dark-900 border border-gray-100 p-4 rounded-2xl flex items-center gap-4 hover:border-lime-200 hover:shadow-sm transition-all group">
                      <div className="w-12 h-12 bg-dark-850 rounded-xl flex items-center justify-center text-lime-400 shadow-sm group-hover:scale-110 transition-transform">
                        <BookOpen size={24} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">University / Institution</p>
                        <p className="text-sm font-semibold text-gray-100">{profileUniversity || "Not provided"}</p>
                      </div>
                    </div>
                    {/* Info Item */}
                    <div className="bg-dark-900 border border-gray-100 p-4 rounded-2xl flex items-center gap-4 hover:border-lime-200 hover:shadow-sm transition-all group">
                      <div className="w-12 h-12 bg-dark-850 rounded-xl flex items-center justify-center text-lime-400 shadow-sm group-hover:scale-110 transition-transform">
                        <Award size={24} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Experience</p>
                        <p className="text-sm font-semibold text-gray-100">
                          {profileYearsOfExperience ? `${profileYearsOfExperience} Years` : "Not provided"}
                        </p>
                      </div>
                    </div>
                    {/* Full Width Address Item */}
                    <div className="md:col-span-2 bg-dark-900 border border-gray-100 p-4 rounded-2xl flex items-center gap-4 hover:border-lime-200 hover:shadow-sm transition-all group">
                      <div className="w-12 h-12 bg-dark-850 rounded-xl flex items-center justify-center text-lime-400 shadow-sm group-hover:scale-110 transition-transform shrink-0">
                        <MapPin size={24} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Home Address</p>
                        <p className="text-sm font-semibold text-gray-100">{profileAddress || "Not provided"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="bg-dark-850 p-8 rounded-3xl shadow-sm border border-gray-100">
                <h4 className="font-bold text-sm text-gray-100 mb-6 flex items-center gap-1.5">
                  <Key size={16} className="text-lime-400" />
                  <span>Update Password</span>
                </h4>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase">
                      Current Password
 <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showOldPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={pwData.oldPassword}
                        onChange={(e) =>
                          setPwData({ ...pwData, oldPassword: e.target.value })
                        }
                        className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:bg-dark-850 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 smooth-transition font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-lime-400 smooth-transition"
                      >
                        {showOldPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase">
                      New Password
 <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={pwData.newPassword}
                        onChange={(e) =>
                          setPwData({ ...pwData, newPassword: e.target.value })
                        }
                        className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:bg-dark-850 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 smooth-transition font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-lime-400 smooth-transition"
                      >
                        {showNewPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="lime-btn w-full py-2.5 mt-2"
                  >
                    Submit Password Change
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* POPUP MODALS */}
              {/* Profile Edit Modal */}
              {isProfileModalOpen && (
                <div className="modal-backdrop">
                  <div className="modal-content max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-dark-850 z-10">
                      <h2 className="text-xl font-bold text-gray-200">Edit Profile</h2>
                      <button type="button" onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-dark-700 rounded-full transition">
                        <X className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                    
                    <div className="p-6">
                      <form onSubmit={handleProfileSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                              Display Name <span className="text-red-500 ml-1">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={profileName}
                              onChange={(e) => setProfileName(e.target.value)}
                              className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:bg-dark-850 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 smooth-transition"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                              Email <span className="text-red-500 ml-1">*</span>
                            </label>
                            <input
                              type="email"
                              required
                              value={profileEmail}
                              onChange={(e) => setProfileEmail(e.target.value)}
                              className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:bg-dark-850 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 smooth-transition"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                              Date of Birth
                            </label>
                            <input
                              type="date"
                              value={profileDob}
                              onChange={(e) => setProfileDob(e.target.value)}
                              className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:bg-dark-850 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 smooth-transition"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                              Years of Experience
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={profileYearsOfExperience}
                              onChange={(e) => setProfileYearsOfExperience(e.target.value)}
                              className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:bg-dark-850 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 smooth-transition"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                            University / Institution
                          </label>
                          <input
                            type="text"
                            value={profileUniversity}
                            onChange={(e) => setProfileUniversity(e.target.value)}
                            placeholder="e.g. Dhaka University"
                            className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:bg-dark-850 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 smooth-transition"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                            Address
                          </label>
                          <textarea
                            rows="2"
                            value={profileAddress}
                            onChange={(e) => setProfileAddress(e.target.value)}
                            placeholder="Full address"
                            className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:bg-dark-850 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 smooth-transition"
                          ></textarea>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                            Profile Picture Image
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const img = new Image();
                                  img.onload = () => {
                                    const canvas = document.createElement('canvas');
                                    let width = img.width;
                                    let height = img.height;
                                    const max_size = 500;
                                    if (width > height) {
                                      if (width > max_size) {
                                        height *= max_size / width;
                                        width = max_size;
                                      }
                                    } else {
                                      if (height > max_size) {
                                        width *= max_size / height;
                                        height = max_size;
                                      }
                                    }
                                    canvas.width = width;
                                    canvas.height = height;
                                    const ctx = canvas.getContext('2d');
                                    ctx.drawImage(img, 0, 0, width, height);
                                    canvas.toBlob((blob) => {
                                      const compressedFile = new File([blob], file.name, {
                                        type: 'image/jpeg',
                                        lastModified: Date.now(),
                                      });
                                      setProfileImageFile(compressedFile);
                                    }, 'image/jpeg', 0.6);
                                  };
                                  img.src = event.target.result;
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-lime-50 file:text-lime-700 hover:file:bg-lime-100 smooth-transition"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-lime-500 text-white rounded-xl font-bold hover:bg-lime-600 smooth-transition shadow-sm"
                        >
                          Save Changes
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

      {/* Modal: Schedule / Edit Exam */}
      <Modal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        title={isEditingExam ? "Edit Exam" : "Schedule Exam"}
      >
        {examCategoryFilter === "academic" ? (
          <form onSubmit={handleSaveExam} className="space-y-4">
            <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase">
              Exam Title
 <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Midterm Assessment"
              value={examForm.title}
              onChange={(e) =>
                setExamForm({ ...examForm, title: e.target.value })
              }
              className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:border-lime-500 smooth-transition"
            />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase">
                Duration (Minutes)
 <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="number"
                required
                placeholder="e.g. 45"
                min="1"
                value={examForm.duration_minutes}
                onChange={(e) =>
                  setExamForm({ ...examForm, duration_minutes: e.target.value })
                }
                className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:border-lime-500 smooth-transition"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase">
                Course Name
              </label>
              <input
                type="text"
                placeholder="e.g. Computer Science 101"
                value={examForm.course_name}
                onChange={(e) =>
                  setExamForm({ ...examForm, course_name: e.target.value })
                }
                className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:border-lime-500 smooth-transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase">
                Course Code
              </label>
              <input
                type="text"
                placeholder="e.g. CS101"
                value={examForm.course_code}
                onChange={(e) =>
                  setExamForm({ ...examForm, course_code: e.target.value })
                }
                className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:border-lime-500 smooth-transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase">
                University
              </label>
              <input
                type="text"
                placeholder="e.g. Dhaka University"
                value={examForm.university_name}
                onChange={(e) =>
                  setExamForm({ ...examForm, university_name: e.target.value })
                }
                className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:border-lime-500 smooth-transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase">
                Max Attempts
 <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="number"
                required
                placeholder="e.g. 1"
                min="1"
                value={examForm.max_attempts}
                onChange={(e) =>
                  setExamForm({
                    ...examForm,
                    max_attempts:
                      e.target.value === "" ? "" : parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:border-lime-500 smooth-transition"
              />
            </div>
          </div>

          <button type="submit" className="lime-btn w-full py-2.5 mt-2">
            Save Exam
          </button>
        </form>
        ) : (
          <form onSubmit={handleSaveExam} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-gray-300 uppercase">
                  Select Event
 <span className="text-red-500 ml-1">*</span>
                </label>
                {examForm.event_id && (
                  <button
                    type="button"
                    onClick={() => fetchRegistrations(examForm.event_id, examForm.title)}
                    className="text-xs text-lime-400 font-bold hover:underline bg-lime-50 px-2 py-0.5 rounded-md"
                  >
                    View Registrations
                  </button>
                )}
              </div>
              <select
                required
                value={examForm.event_id}
                onChange={(e) => {
                  const selectedEvent = eventsList.find(ev => ev._id === e.target.value);
                  setExamForm({ 
                    ...examForm, 
                    event_id: e.target.value,
                    title: selectedEvent ? selectedEvent.title : ""
                  });
                }}
                className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:border-lime-500 smooth-transition"
              >
                <option value="">-- Choose an Event --</option>
                {eventsList.map(ev => (
                  <option key={ev._id} value={ev._id}>{ev.title}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase">
                  Duration (Minutes)
 <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 45"
                  min="1"
                  value={examForm.duration_minutes}
                  onChange={(e) =>
                    setExamForm({ ...examForm, duration_minutes: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:border-lime-500 smooth-transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase">
                  Exam Password (Secret Code)
 <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EVENT123"
                  value={examForm.exam_password}
                  onChange={(e) =>
                    setExamForm({ ...examForm, exam_password: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:border-lime-500 smooth-transition"
                />
              </div>
            </div>
            <button type="submit" className="lime-btn w-full py-2.5 mt-2">
              Create Event Exam
            </button>
          </form>
        )}
      </Modal>

      {/* Modal: Make Live */}
      <Modal
        isOpen={isLiveModalOpen}
        onClose={() => setIsLiveModalOpen(false)}
        title="Make Exam Live"
      >
        <form onSubmit={handleMakeLiveSubmit} className="space-y-4">
          <p className="text-xs text-gray-400">
            Set a secure password for this exam. Students will need this
            password to enter the exam room.
          </p>
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase">
              Exam Password
 <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Secret123"
              value={liveForm.password}
              onChange={(e) => setLiveForm({ password: e.target.value })}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:border-lime-500 smooth-transition font-mono"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 mt-2 bg-lime-500 hover:bg-lime-600 text-white rounded-xl font-bold shadow-md transition-colors flex justify-center items-center gap-2"
          >
            <Play size={16} /> Start Live Exam Now
          </button>
        </form>
      </Modal>

      {/* Modal: No Questions Warning */}
      <Modal
        isOpen={isNoQuestionsModalOpen}
        onClose={() => setIsNoQuestionsModalOpen(false)}
        title="Action Required"
      >
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert size={32} />
          </div>
          <h3 className="font-bold text-gray-100 text-lg mb-2">
            No Questions Set
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            You cannot make this exam live because it doesn't have any
            questions. Please click <strong>Go to Set Questions</strong> to add
            questions first.
          </p>
          <button
            onClick={() => {
              setIsNoQuestionsModalOpen(false);
              setSelectedExamId(examForm.id);
              fetchQuestions(examForm.id);
              setIsManageQuestionsModalOpen(true);
            }}
            className="w-full py-2.5 bg-lime-500 hover:bg-lime-600 text-white rounded-xl font-bold shadow-md transition-colors"
          >
            Go to Set Questions
          </button>
        </div>
      </Modal>

      {/* Modal: Manage Questions */}
      <Modal
        isOpen={isManageQuestionsModalOpen}
        onClose={() => setIsManageQuestionsModalOpen(false)}
        title="Manage Questions"
        maxWidth="max-w-7xl"
      >
        <div className="space-y-6 min-h-[60vh]">
          <div className="flex items-center justify-between border-b border-dark-700 pb-4">
            <div>
              <h4 className="font-bold text-gray-100">
                {exams.find(
                  (e) =>
                    e.id ===
                    (typeof selectedExamId === "string"
                      ? parseInt(selectedExamId)
                      : selectedExamId),
                )?.title || "Exam Questions"}
              </h4>
              <p className="text-xs text-gray-400">
                Add, edit or delete questions for this exam.
              </p>
            </div>
            <button
              onClick={() => {
                setQuestionForm({
                  id: null,
                  question_text: "",
                  marks: 1,
                  option_a: "",
                  option_b: "",
                  option_c: "",
                  option_d: "",
                  correct_option: "A",
                });
                setIsEditingQuestion(false);
                setIsQuestionModalOpen(true);
              }}
              className="lime-btn py-2 text-xs flex items-center gap-1 shrink-0"
            >
              <Plus size={14} />
              <span>Add Question</span>
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="border border-dashed border-dark-700 bg-dark-900/50 py-12 rounded-xl text-center text-xs text-gray-400">
              No questions added to this exam yet.
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {questions.map((q, qidx) => (
                <div
                  key={q.id.toString()}
                  draggable
                  onDragStart={() => setDragItemIndex(qidx)}
                  onDragEnter={() => setDragOverItemIndex(qidx)}
                  onDragEnd={handleSort}
                  onDragOver={(e) => e.preventDefault()}
                  className={`border border-dark-700 bg-dark-850 p-5 rounded-xl relative hover:border-dark-600 transition-colors flex gap-3 ${
                    dragItemIndex === qidx ? "opacity-50 border-dashed border-dark-600 bg-dark-900" : ""
                  }`}
                >
                  <div className="mt-1 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400">
                    <GripVertical size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={() => {
                          setQuestionTab(q.type);
                          setQuestionForm({
                            id: q.id,
                            question_text: q.question_text,
                            marks: q.marks,
                            option_a: q.option_a || "",
                            option_b: q.option_b || "",
                            option_c: q.option_c || "",
                            option_d: q.option_d || "",
                            correct_option: q.correct_option || "A",
                          });
                          setIsEditingQuestion(true);
                          setIsQuestionModalOpen(true);
                        }}
                        className="text-lime-400 hover:text-lime-700"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="text-gray-300 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex items-start gap-3 mb-3 pr-16">
                      <span className="bg-dark-800 text-gray-400 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">
                        {q.type}
                      </span>
                      <span className="bg-lime-50 text-lime-600 border border-lime-100 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">
                        {q.marks} Mark(s)
                      </span>
                      <p className="font-bold text-sm text-gray-100 leading-tight">
                        Q{qidx + 1}: {q.question_text}
                      </p>
                    </div>

                    {q.type === "MCQ" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3 pl-20">
                        {["A", "B", "C", "D"].map((opt) => (
                          <div
                            key={opt}
                            className={`p-2 rounded-lg border ${q.correct_option === opt ? "bg-lime-50 border-lime-200 text-lime-700 font-semibold" : "border-gray-100 text-gray-400"}`}
                          >
                            {opt}) {q[`option_${opt.toLowerCase()}`]}
                          </div>
                        ))}
                      </div>
                    )}
                    {q.type === "Written" && (
                      <div className="pl-20">
                        <div className="bg-dark-900 border border-dashed border-dark-700 rounded-lg p-4 text-xs text-gray-400 italic">
                          Students will type their answer in a text box.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Modal: Add/Edit Question */}
      <Modal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        title={isEditingQuestion ? "Edit Question" : "Add Question"}
      >
        {/* Tabs for Question Type */}
        <div className="flex mb-4 bg-dark-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setQuestionTab("MCQ")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${questionTab === "MCQ" ? "bg-dark-850 text-gray-100 shadow-sm" : "text-gray-400 hover:text-gray-100"}`}
          >
            MCQ
          </button>
          <button
            type="button"
            onClick={() => setQuestionTab("Written")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${questionTab === "Written" ? "bg-dark-850 text-gray-100 shadow-sm" : "text-gray-400 hover:text-gray-100"}`}
          >
            Written
          </button>
        </div>

        <form onSubmit={handleSaveQuestion} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase font-mono">
              Question Text
 <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              required
              placeholder="Type the question content here..."
              value={questionForm.question_text}
              onChange={(e) =>
                setQuestionForm({
                  ...questionForm,
                  question_text: e.target.value,
                })
              }
              className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:border-lime-500 h-20 resize-none smooth-transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase font-mono">
              Marks for this question
 <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              value={questionForm.marks}
              onChange={(e) =>
                setQuestionForm({
                  ...questionForm,
                  marks: e.target.value === "" ? "" : parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:border-lime-500 smooth-transition"
            />
          </div>

          {questionTab === "MCQ" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {["a", "b", "c", "d"].map((opt) => (
                  <div key={opt}>
                    <label className="block text-xs font-bold text-gray-300 mb-1 uppercase">
                      Option {opt}
 <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={`Option ${opt.toUpperCase()}`}
                      value={questionForm[`option_${opt}`]}
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          [`option_${opt}`]: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-xl text-xs focus:outline-none focus:border-lime-500 smooth-transition"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase">
                  Correct Option
 <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  required
                  value={questionForm.correct_option}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      correct_option: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-xl text-sm focus:outline-none focus:border-lime-500 smooth-transition"
                >
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>
            </>
          )}

          <button type="submit" className="lime-btn w-full py-2.5 mt-2">
            Save Question
          </button>
        </form>
      </Modal>

      {/* Modal: View Answersheet */}
      {isAnswersModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-850 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-up">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-dark-900 rounded-t-2xl">
              <div>
                <h3 className="font-extrabold text-lg text-gray-100">
                  Answersheet: {selectedStudentForAnswers?.name}
                </h3>
                <p className="text-xs text-gray-400">
                  Review and grade the student's submission.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsAnswersModalOpen(false)}
                  className="text-gray-400 hover:text-gray-100"
                >
                  <Menu size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-dark-900">
              {studentAnswers.length === 0 ? (
                <div className="text-center text-gray-400 py-10">
                  No answers recorded.
                </div>
              ) : (
                <div className="space-y-6">
                  {studentAnswers.map((ans, idx) => (
                    <div
                      key={ans.answer_id}
                      className="bg-dark-850 border border-dark-700 rounded-xl p-5 shadow-sm"
                    >
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="flex-1">
                          <span className="bg-dark-800 text-gray-400 px-2 py-0.5 rounded text-[10px] font-bold shrink-0 mb-2 inline-block">
                            {ans.type} | Max Marks: {ans.max_marks}
                          </span>
                          <p className="font-bold text-sm text-gray-100">
                            Q{idx + 1}: {ans.question_text}
                          </p>
                        </div>
                        <div className="shrink-0 w-24">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 text-right">
                            Awarded Marks
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={ans.max_marks}
                            value={
                              manualGrades[ans.answer_id] !== undefined
                                ? manualGrades[ans.answer_id]
                                : ans.marks_awarded !== null
                                  ? ans.marks_awarded
                                  : ""
                            }
                            onChange={(e) =>
                              setManualGrades({
                                ...manualGrades,
                                [ans.answer_id]:
                                  e.target.value === ""
                                    ? ""
                                    : parseInt(e.target.value),
                              })
                            }
                            className="w-full text-right px-3 py-1.5 border border-dark-700 rounded-lg text-sm font-bold focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500"
                            placeholder="-"
                          />
                        </div>
                      </div>

                      {ans.type === "MCQ" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                          {["A", "B", "C", "D"].map((opt) => (
                            <div
                              key={opt}
                              className={`p-2 rounded-lg border ${
                                ans.correct_option === opt
                                  ? "bg-lime-50 border-lime-200 text-lime-700 font-semibold"
                                  : ans.student_answer === opt
                                    ? "bg-red-50 border-red-200 text-red-700 line-through"
                                    : "border-gray-100 text-gray-400"
                              }`}
                            >
                              {opt}) {ans[`option_${opt.toLowerCase()}`]}
                              {ans.student_answer === opt && (
                                <span className="ml-2 font-bold">
                                  (Student's Answer)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {ans.type === "Written" && (
                        <div>
                          <p className="text-xs font-bold text-gray-400 mb-1">
                            Student's Answer:
                          </p>
                          <div className="bg-lime-50/50 border border-lime-100 p-4 rounded-lg text-sm text-gray-100 whitespace-pre-wrap min-h-[60px]">
                            {ans.student_answer || (
                              <span className="text-gray-400 italic">
                                No answer provided.
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-dark-850 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setIsAnswersModalOpen(false)}
                className="px-5 py-2 rounded-xl font-bold text-gray-400 hover:bg-dark-700"
              >
                Cancel
              </button>
              <button
                onClick={handleManualGradeSubmit}
                className="lime-btn px-6 py-2"
              >
                Save Grades
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Stop Exam */}
      {isStopExamModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-850 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col animate-scale-up">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-dark-900 rounded-t-2xl">
              <div>
                <h3 className="font-extrabold text-lg text-gray-100">
                  Stop this exam?
                </h3>
              </div>
            </div>
            <div className="p-6 bg-dark-850">
              <p className="text-sm text-gray-400">
                Students will no longer be able to enter.
              </p>
            </div>
            <div className="p-4 border-t border-gray-100 bg-dark-900 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsStopExamModalOpen(false);
                  setExamToStopId(null);
                }}
                className="px-5 py-2 rounded-xl font-bold text-gray-400 hover:bg-dark-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmStopLive}
                className="px-5 py-2 rounded-xl font-bold bg-lime-500 text-white hover:bg-lime-600 shadow-lg shadow-lime-500/30 transition-all"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registrations Modal */}
      <Modal 
        isOpen={isRegistrationsModalOpen} 
        onClose={() => setIsRegistrationsModalOpen(false)} 
        title={`Registrations: ${selectedEventTitle}`} 
        maxWidth="max-w-4xl"
      >
        <div className="overflow-x-auto">
          {registrationsLoading ? (
            <div className="text-center py-10 text-gray-400 font-medium">Loading registrations...</div>
          ) : selectedEventRegistrations.length === 0 ? (
            <div className="text-center py-10 text-gray-400 font-medium bg-dark-900 rounded-xl border border-dashed border-dark-700">No registrations found.</div>
          ) : (
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden border border-dark-700 sm:rounded-xl">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-lime-50 text-lime-800">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-bold text-lime-800 uppercase tracking-wider sm:pl-6">Name</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-lime-800 uppercase tracking-wider">Email</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-lime-800 uppercase tracking-wider">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-dark-850">
                    {selectedEventRegistrations.map((reg) => (
                      <tr key={reg._id} className="hover:bg-dark-900 transition-colors">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-semibold text-gray-100 sm:pl-6">{reg.name}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{reg.email}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{reg.phone || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>


      {/* Mobile Bottom Navigation Bar */}
      {(() => {
        const mobileTabs = [
          { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { id: 'add_exam', label: 'Exams', icon: FileText },
          { id: 'exam_results', label: 'Results', icon: Award },
          { id: 'proctoring', label: 'Proctoring', icon: Camera },
          { id: 'events', label: 'Events', icon: Calendar },
          { id: 'profile', label: 'Profile', icon: Settings }
        ];
        const activeIdx = mobileTabs.findIndex(t => t.id === activeTab);
        const currentIndex = activeIdx !== -1 ? activeIdx : 0;
        const tabWidth = 100 / mobileTabs.length;

        return (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-dark-850 border-t border-dark-700 z-50 flex items-center justify-between pb-safe shadow-[0_-8px_16px_-4px_rgba(0,0,0,0.05)]">
            {/* Animated Top Line */}
            <div 
              className="absolute top-0 h-1 bg-lime-500 rounded-b-full transition-all duration-300 ease-in-out shadow-sm"
              style={{
                width: '32px',
                left: `calc(${(currentIndex * tabWidth)}% + ${tabWidth / 2}% - 16px)`
              }}
            />
            {mobileTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center w-full py-2.5 transition-all duration-300 ${activeTab === tab.id ? 'text-lime-400' : 'text-gray-400 hover:text-gray-400'}`}
              >
                <tab.icon size={20} className={`mb-1 transition-transform duration-300 ${activeTab === tab.id ? 'scale-110 drop-shadow-sm' : ''}`} />
                <span className={`text-[9px] font-bold truncate max-w-full transition-all duration-300 ${activeTab === tab.id ? 'opacity-100' : 'opacity-80 font-medium'}`}>{tab.label}</span>
              </button>
            ))}
          </div>
        );
      })()}
    </div>
  );
}