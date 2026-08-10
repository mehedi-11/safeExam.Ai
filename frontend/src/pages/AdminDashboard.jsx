import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";
import {
  Users,
  UserCheck,
  Check,
  X,
  Trash2,
  Plus,
  UserMinus,
  Menu,
  LogOut,
  Eye,
  EyeOff,
  LayoutDashboard,
  Shield,
  FileText,
  Bell,
  Search,
  Activity,
  Download,
  Upload,
  Settings,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Modal from "../components/Modal";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [activeTab, setActiveTab] = useState("overview");
  const [activeUserTab, setActiveUserTab] = useState("students");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notifRef = useRef(null);
  const mobileNotifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isOutsideNotif = notifRef.current && !notifRef.current.contains(event.target);
      const isOutsideMobileNotif = mobileNotifRef.current && !mobileNotifRef.current.contains(event.target);
      
      if (isOutsideNotif && isOutsideMobileNotif) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [stats, setStats] = useState({
    totalTeachers: 0,
    totalStudents: 0,
    totalLiveExams: 0,
    totalExamsCreated: 0,
    totalExamsDone: 0,
  });
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    password: "",
    is_super_admin: false,
  });
  const [studentSearch, setStudentSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals Open State
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isPendingTeacherModalOpen, setIsPendingTeacherModalOpen] =
    useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Form Fields State
  const [studentForm, setStudentForm] = useState({
    id: "",
    name: "",
    email: "",
    password: "",
  });
  const [teacherForm, setTeacherForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [showTeacherPassword, setShowTeacherPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Student Exams Modal State
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);
  const [studentExamDetails, setStudentExamDetails] = useState([]);
  const [loadingStudentExams, setLoadingStudentExams] = useState(false);

  // Axios Instance with JWT auth is now centralized in api

  useEffect(() => {
    if (!token) {
      navigate("/login/admin");
      return;
    }
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [tRes, sRes, aRes, stRes, pRes, nRes, alRes, anRes] =
        await Promise.all([
          api.get("/admin/teachers"),
          api.get("/admin/students"),
          api.get("/admin/admins"),
          api.get("/admin/dashboard-stats"),
          api.get("/admin/profile"),
          api.get("/admin/notifications"),
          api.get("/admin/analytics"),
        ]);

      setTeachers(tRes.data);
      setStudents(sRes.data);
      setAdmins(aRes.data);
      setStats(stRes.data);
      setProfile({ ...pRes.data, password: "" });
      setNotifications(nRes.data);
      setAnalytics(anRes.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.clear();
        navigate("/login/admin");
      } else {
        setError("Failed to fetch dashboard data.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper flash success message
  const triggerSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 4000);
  };

  // --- Profile Actions ---
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.put("/admin/profile", profile);
      triggerSuccess("Profile credentials updated successfully");
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Error updating profile");
    }
  };

  // --- Admin Actions ---
  const handleAddAdmin = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/admins", adminForm);
      setIsAdminModalOpen(false);
      setAdminForm({ name: "", email: "", password: "" });
      triggerSuccess("Admin added successfully");
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Error adding admin");
    }
  };

  // --- Student Actions ---
  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/students", studentForm);
      setIsStudentModalOpen(false);
      setStudentForm({ id: "", name: "", email: "", password: "" });
      triggerSuccess("Student added successfully");
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Error adding student");
    }
  };

  // --- Teacher Actions ---
  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/teachers", teacherForm);
      setIsTeacherModalOpen(false);
      setTeacherForm({ name: "", email: "", password: "" });
      triggerSuccess("Teacher added successfully");
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Error adding teacher");
    }
  };

  const handleCloseModal = () => {
    setIsStudentModalOpen(false);
    setIsTeacherModalOpen(false);
    setIsAdminModalOpen(false);
    setStudentForm({ id: "", name: "", email: "", password: "" });
    setTeacherForm({ name: "", email: "", password: "" });
    setAdminForm({ name: "", email: "", password: "" });
    setShowStudentPassword(false);
    setShowTeacherPassword(false);
    setShowAdminPassword(false);
    setSelectedStudentForModal(null);
    setStudentExamDetails([]);
  };

  const handleOpenStudentExamsModal = async (student) => {
    setSelectedStudentForModal(student);
    setLoadingStudentExams(true);
    try {
      const res = await api.get(`/admin/student-exams/${student.id}`);
      setStudentExamDetails(res.data);
    } catch (err) {
      console.error("Failed to fetch student exams", err);
    } finally {
      setLoadingStudentExams(false);
    }
  };

  const handleUpdateTeacherStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === "approved" ? "suspended" : "approved";
    try {
      await api.put(`/admin/teachers/${id}/status`, { status: nextStatus });
      triggerSuccess(`Teacher status updated to ${nextStatus}`);
      fetchData();
    } catch (err) {
      setError("Error updating status");
    }
  };

  const handleDeleteTeacher = async (id) => {
    if (!window.confirm("Are you sure you want to delete this teacher?"))
      return;
    try {
      await api.delete(`/admin/teachers/${id}`);
      triggerSuccess("Teacher deleted successfully");
      fetchData();
    } catch (err) {
      setError("Error deleting teacher");
    }
  };

  const handleUpdateStudentStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === "approved" ? "suspended" : "approved";
    try {
      await api.put(`/admin/students/${id}/status`, { status: nextStatus });
      triggerSuccess(`Student status updated to ${nextStatus}`);
      fetchData();
    } catch (err) {
      setError("Error updating student status");
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student?"))
      return;
    try {
      await api.delete(`/admin/students/${id}`);
      triggerSuccess("Student deleted successfully");
      fetchData();
    } catch (err) {
      setError("Error deleting student");
    }
  };

  // --- New Features Logic ---
  const handleBulkImport = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          setLoading(true);
          const endpoint =
            type === "student"
              ? "/admin/students/bulk"
              : "/admin/teachers/bulk";
          const payloadKey = type === "student" ? "students" : "teachers";
          await api.post(endpoint, { [payloadKey]: results.data });
          triggerSuccess(
            `${type === "student" ? "Students" : "Teachers"} imported successfully`,
          );
          fetchData();
        } catch (err) {
          setError(
            `Error importing ${type}s: ` +
              (err.response?.data?.message || err.message),
          );
        } finally {
          setLoading(false);
          e.target.value = null; // reset input
        }
      },
    });
  };

  const exportToCSV = (data, filename) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename + ".csv";
    link.click();
  };

  const exportToPDF = (data, headers, filename) => {
    const doc = new jsPDF();
    const tableData = data.map((obj) => headers.map((h) => obj[h.key]));
    autoTable(doc, {
      head: [headers.map((h) => h.label)],
      body: tableData,
    });
    doc.save(filename + ".pdf");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-150 p-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-tomato-500 flex items-center justify-center text-white font-extrabold text-sm">
            <LayoutDashboard size={16} />
          </div>
          <span className="font-extrabold text-md text-black">
            S-Exam<span className="text-tomato-500">.ai</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative" ref={mobileNotifRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-55 transition-colors relative"
            >
              {isNotificationsOpen ? <X size={20} /> : <Bell size={20} />}
              {notifications.filter((n) => !n.is_read).length > 0 && !isNotificationsOpen && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-tomato-500 rounded-full"></span>
              )}
            </button>
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-150 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-gray-150 flex justify-between items-center bg-gray-50">
                  <span className="font-bold text-sm text-dark-900">Notifications</span>
                  <button
                    onClick={async () => {
                      try {
                        await api.put("/admin/notifications/mark-read");
                        fetchData();
                      } catch (err) {}
                    }}
                    className="text-[10px] font-bold text-tomato-500 hover:underline"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                  {notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      className={`p-2 text-xs rounded-lg ${n.is_read ? "text-gray-500" : "bg-blue-50 text-dark-900 font-semibold"}`}
                    >
                      {n.message}
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <p className="text-xs text-gray-400 p-2 text-center">No notifications</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-55 transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <div
        className={`fixed inset-y-0 left-0 bg-white border-r border-gray-150 w-64 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static flex flex-col justify-between shrink-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          <div className="p-6 border-b border-gray-150 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-tomato-500 flex items-center justify-center text-white shadow-lg shadow-tomato-500/20">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight text-black">
                  S-Exam<span className="text-tomato-500">.ai</span>
                </span>
                <span className="text-[10px] text-gray-400 block font-semibold tracking-widest uppercase">
                  Admin Portal
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1.5 text-gray-400 hover:text-dark-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-4 space-y-1.5">
            {[
              { id: "overview", label: "Dashboard", icon: LayoutDashboard },
              { id: "users", label: "Manage Users", icon: Users },
              { id: "settings", label: "Admin Profile", icon: Settings },
            ].map((tab) => {
              const unreadCount =
                tab.id === "notifications"
                  ? notifications.filter((n) => !n.is_read).length
                  : 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setError("");
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 font-semibold text-sm rounded-xl transition-all ${
                    activeTab === tab.id
                      ? "bg-tomato-500 text-white shadow-lg shadow-tomato-500/20 animate-fade-in"
                      : "text-gray-500 hover:text-dark-900 hover:bg-gray-100/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <tab.icon size={18} />
                    <span>{tab.label}</span>
                  </div>
                  {unreadCount > 0 && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        activeTab === tab.id
                          ? "bg-white text-tomato-500"
                          : "bg-tomato-500 text-white"
                      }`}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-gray-150 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-tomato-100 text-tomato-500 flex items-center justify-center border border-tomato-200 font-extrabold">
              {profile.name ? profile.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs text-dark-900 block truncate">
                {profile.name || "System Admin"}
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
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 hover:border-tomato-500 hover:bg-tomato-50/10 hover:text-tomato-600 rounded-xl text-xs font-bold text-gray-650 transition-all active:scale-95"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-grow flex-1 min-w-0 p-6 md:p-10 max-h-screen overflow-y-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-dark-900">
              Admin Control Center
            </h1>
            <p className="text-gray-400 text-sm">
              Oversee registrations, user accounts, and system status.
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 relative transition-colors"
              >
                {isNotificationsOpen ? <X size={18} /> : <Bell size={18} />}
                {notifications.filter((n) => !n.is_read).length > 0 && !isNotificationsOpen && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-tomato-500 rounded-full"></span>
                )}
              </button>
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-150 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-gray-150 flex justify-between items-center bg-gray-50">
                    <span className="font-bold text-sm text-dark-900">Notifications</span>
                    <button
                      onClick={async () => {
                        try {
                          await api.put("/admin/notifications/mark-read");
                          fetchData();
                        } catch (err) {}
                      }}
                      className="text-[10px] font-bold text-tomato-500 hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                    {notifications.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        className={`p-2 text-xs rounded-lg ${n.is_read ? "text-gray-500" : "bg-blue-50 text-dark-900 font-semibold"}`}
                      >
                        {n.message}
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <p className="text-xs text-gray-400 p-2 text-center">No notifications</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 py-3 px-5 rounded-xl text-xs font-semibold mb-6 flex items-center gap-2 animate-fade-in shadow-sm">
            <ShieldCheck size={16} />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 py-3 px-5 rounded-xl text-xs font-semibold mb-6 flex items-center gap-2 animate-fade-in shadow-sm">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Dynamic Content Sections */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 md:p-8 shadow-sm">
          {/* TAB: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-fade-in">
              <h3 className="text-lg font-bold text-dark-900 mb-4 flex items-center gap-2">
                <LayoutDashboard size={18} className="text-tomato-500" />
                <span>System Statistics</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  <div className="bg-blue-500 text-white p-3 rounded-xl mb-3">
                    <Users size={24} />
                  </div>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Total Students
                  </p>
                  <p className="text-3xl font-black text-dark-900">
                    {stats.totalStudents}
                  </p>
                </div>

                <div className="bg-green-50 border border-green-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  <div className="bg-green-500 text-white p-3 rounded-xl mb-3">
                    <UserCheck size={24} />
                  </div>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Total Teachers
                  </p>
                  <p className="text-3xl font-black text-dark-900">
                    {stats.totalTeachers}
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  <div className="bg-yellow-500 text-white p-3 rounded-xl mb-3">
                    <FileText size={24} />
                  </div>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Exams Created
                  </p>
                  <p className="text-3xl font-black text-dark-900">
                    {stats.totalExamsCreated}
                  </p>
                </div>

                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  <div className="bg-purple-500 text-white p-3 rounded-xl mb-3">
                    <Check size={24} />
                  </div>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Exams Done
                  </p>
                  <p className="text-3xl font-black text-dark-900">
                    {stats.totalExamsDone}
                  </p>
                </div>

                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  <div className="bg-red-500 text-white p-3 rounded-xl mb-3">
                    <Activity size={24} />
                  </div>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Live Exams
                  </p>
                  <p className="text-3xl font-black text-dark-900">
                    {stats.totalLiveExams}
                  </p>
                </div>
              </div>

              {/* Top Teachers Table */}
              <div className="mt-8 border-t border-gray-150 pt-8">
                <h3 className="text-lg font-bold text-dark-900 mb-4 flex items-center gap-2">
                  <UserCheck size={18} className="text-tomato-500" />
                  <span>Top 5 Teachers (By Exams Created)</span>
                </h3>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 font-bold">Rank</th>
                          <th className="px-6 py-4 font-bold">Teacher Name</th>
                          <th className="px-6 py-4 font-bold">Email</th>
                          <th className="px-6 py-4 font-bold text-right">Exams Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stats?.topTeachers?.map((teacher, index) => (
                          <tr key={teacher.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-semibold">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${index === 0 ? 'bg-yellow-100 text-yellow-600' : index === 1 ? 'bg-gray-200 text-gray-600' : index === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                                {index + 1}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-semibold text-dark-900">{teacher.name}</td>
                            <td className="px-6 py-4 text-xs">{teacher.email}</td>
                            <td className="px-6 py-4 text-right font-bold text-tomato-500">{teacher.exam_count}</td>
                          </tr>
                        ))}
                        {(!stats?.topTeachers || stats.topTeachers.length === 0) && (
                          <tr>
                            <td colSpan="4" className="px-6 py-8 text-center text-gray-400">
                              No data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Top Students Table */}
              <div className="mt-8 border-t border-gray-150 pt-8">
                <h3 className="text-lg font-bold text-dark-900 mb-4 flex items-center gap-2">
                  <Users size={18} className="text-tomato-500" />
                  <span>Top 10 Students (By Average Score)</span>
                </h3>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 font-bold">Rank</th>
                          <th className="px-6 py-4 font-bold">Student Name</th>
                          <th className="px-6 py-4 font-bold">Email</th>
                          <th className="px-6 py-4 font-bold text-center">Avg Score</th>
                          <th className="px-6 py-4 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stats?.topStudents?.map((student, index) => (
                          <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-semibold">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${index === 0 ? 'bg-yellow-100 text-yellow-600' : index === 1 ? 'bg-gray-200 text-gray-600' : index === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                                {index + 1}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-semibold text-dark-900">{student.name}</td>
                            <td className="px-6 py-4 text-xs">{student.email}</td>
                            <td className="px-6 py-4 text-center font-bold text-green-600">{Number(student.average_score).toFixed(2)}%</td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleOpenStudentExamsModal(student)}
                                className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                        {(!stats?.topStudents || stats.topStudents.length === 0) && (
                          <tr>
                            <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                              No data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* INJECTED ANALYTICS */}
              <div className="mt-8 border-t border-gray-150 pt-8">
                {analytics && (
                  <div className="space-y-6 animate-fade-in">
                    <h3 className="text-lg font-bold text-dark-900">
                      System Analytics
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-gray-50 border border-gray-150 p-4 rounded-xl">
                        <h4 className="font-bold text-sm mb-4">
                          Exams Created (This Year)
                        </h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.monthlyExams}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="count" fill="#ff6347" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="bg-gray-50 border border-gray-150 p-4 rounded-xl">
                        <h4 className="font-bold text-sm mb-4">
                          Proctoring Alerts Summary
                        </h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.cheatingStats}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="activity_type" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="count" fill="#3b82f6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB: USERS */}
          {activeTab === "users" && (
            <div className="animate-fade-in space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                  <button
                    onClick={() => setActiveUserTab("students")}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeUserTab === "students" ? "bg-white shadow-sm text-tomato-500" : "text-gray-500 hover:text-dark-900"}`}
                  >
                    Students
                  </button>
                  <button
                    onClick={() => setActiveUserTab("teachers")}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeUserTab === "teachers" ? "bg-white shadow-sm text-tomato-500" : "text-gray-500 hover:text-dark-900"}`}
                  >
                    Teachers
                  </button>
                </div>

                {activeUserTab === "teachers" && (
                  <button
                    onClick={() => setIsPendingTeacherModalOpen(true)}
                    className="flex items-center gap-2 bg-yellow-50 text-yellow-700 border border-yellow-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-yellow-100 transition"
                  >
                    <UserCheck size={14} />
                    <span>
                      Pending Requests (
                      {teachers.filter((t) => t.status === "pending").length})
                    </span>
                  </button>
                )}
              </div>

              {/* STUDENTS TAB */}
              {activeUserTab === "students" && (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h4 className="font-bold text-dark-900">Student List</h4>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="relative flex-grow md:w-64">
                        <Search
                          className="absolute left-3 top-2 text-gray-400"
                          size={16}
                        />
                        <input
                          type="text"
                          placeholder="Search by ID or Name..."
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500"
                        />
                      </div>
                      <button
                        onClick={() => setIsStudentModalOpen(true)}
                        className="tomato-btn py-2 text-xs flex items-center gap-1 shrink-0"
                      >
                        <Plus size={14} />{" "}
                        <span className="hidden sm:inline">Add Student</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border border-gray-200 transition">
                      <Upload size={13} /> <span>Bulk Import CSV</span>
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => handleBulkImport(e, "student")}
                      />
                    </label>
                    <button
                      onClick={() => exportToCSV(students, "Students")}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border border-gray-200 transition"
                    >
                      <Download size={13} /> <span>Export CSV</span>
                    </button>
                    <button
                      onClick={() =>
                        exportToPDF(
                          students,
                          [
                            { key: "id", label: "ID" },
                            { key: "name", label: "Name" },
                            { key: "email", label: "Email" },
                            { key: "status", label: "Status" },
                          ],
                          "Students",
                        )
                      }
                      className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border border-gray-200 transition"
                    >
                      <Download size={13} /> <span>Export PDF</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto border border-gray-150 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-150 text-gray-500 font-bold uppercase tracking-wider">
                          <th className="p-4">Student ID</th>
                          <th className="p-4">Name</th>
                          <th className="p-4">Email</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150">
                        {students
                          .filter(
                            (s) =>
                              s.name
                                .toLowerCase()
                                .includes(studentSearch.toLowerCase()) ||
                              s.id
                                .toLowerCase()
                                .includes(studentSearch.toLowerCase()),
                          )
                          .map((student) => (
                            <tr
                              key={student.id}
                              className="hover:bg-gray-50/50"
                            >
                              <td className="p-4 font-mono font-bold text-dark-900">
                                {student.id}
                              </td>
                              <td className="p-4 font-bold text-dark-900">
                                {student.name}
                              </td>
                              <td className="p-4">{student.email}</td>
                              <td className="p-4">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${student.status === "approved" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}
                                >
                                  {student.status}
                                </span>
                              </td>
                              <td className="p-4 flex justify-center gap-2">
                                <button
                                  onClick={() =>
                                    handleUpdateStudentStatus(
                                      student.id,
                                      student.status,
                                    )
                                  }
                                  className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 ${student.status === "approved" ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}
                                >
                                  {student.status === "approved" ? (
                                    <UserMinus size={13} />
                                  ) : (
                                    <UserCheck size={13} />
                                  )}
                                  <span>
                                    {student.status === "approved"
                                      ? "Suspend"
                                      : "Activate"}
                                  </span>
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteStudent(student.id)
                                  }
                                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TEACHERS TAB */}
              {activeUserTab === "teachers" && (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h4 className="font-bold text-dark-900">
                      Approved Teachers
                    </h4>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="relative flex-grow md:w-64">
                        <Search
                          className="absolute left-3 top-2 text-gray-400"
                          size={16}
                        />
                        <input
                          type="text"
                          placeholder="Search by Name or Email..."
                          value={teacherSearch}
                          onChange={(e) => setTeacherSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500"
                        />
                      </div>
                      <button
                        onClick={() => setIsTeacherModalOpen(true)}
                        className="tomato-btn py-2 text-xs flex items-center gap-1 shrink-0"
                      >
                        <Plus size={14} />{" "}
                        <span className="hidden sm:inline">Add Teacher</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border border-gray-200 transition">
                      <Upload size={13} /> <span>Bulk Import CSV</span>
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => handleBulkImport(e, "teacher")}
                      />
                    </label>
                    <button
                      onClick={() =>
                        exportToCSV(
                          teachers.filter((t) => t.status !== "pending"),
                          "Teachers",
                        )
                      }
                      className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border border-gray-200 transition"
                    >
                      <Download size={13} /> <span>Export CSV</span>
                    </button>
                    <button
                      onClick={() =>
                        exportToPDF(
                          teachers.filter((t) => t.status !== "pending"),
                          [
                            { key: "name", label: "Name" },
                            { key: "email", label: "Email" },
                            { key: "status", label: "Status" },
                            { key: "joining_date", label: "Joined Date" },
                          ],
                          "Teachers",
                        )
                      }
                      className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border border-gray-200 transition"
                    >
                      <Download size={13} /> <span>Export PDF</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto border border-gray-150 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-150 text-gray-500 font-bold uppercase tracking-wider">
                          <th className="p-4">Name</th>
                          <th className="p-4">Email</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Joined Date</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150">
                        {teachers
                          .filter(
                            (t) =>
                              t.status !== "pending" &&
                              (t.name
                                .toLowerCase()
                                .includes(teacherSearch.toLowerCase()) ||
                                t.email
                                  .toLowerCase()
                                  .includes(teacherSearch.toLowerCase())),
                          )
                          .map((teacher) => (
                            <tr
                              key={teacher.id}
                              className="hover:bg-gray-50/50"
                            >
                              <td className="p-4 font-bold text-dark-900">
                                {teacher.name}
                              </td>
                              <td className="p-4">{teacher.email}</td>
                              <td className="p-4">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${teacher.status === "approved" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}
                                >
                                  {teacher.status}
                                </span>
                              </td>
                              <td className="p-4">
                                {new Date(
                                  teacher.joining_date,
                                ).toLocaleDateString()}
                              </td>
                              <td className="p-4 flex justify-center gap-2">
                                <button
                                  onClick={() =>
                                    handleUpdateTeacherStatus(
                                      teacher.id,
                                      teacher.status,
                                    )
                                  }
                                  className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 ${teacher.status === "approved" ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}
                                >
                                  {teacher.status === "approved" ? (
                                    <UserMinus size={13} />
                                  ) : (
                                    <UserCheck size={13} />
                                  )}
                                  <span>
                                    {teacher.status === "approved"
                                      ? "Suspend"
                                      : "Activate"}
                                  </span>
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteTeacher(teacher.id)
                                  }
                                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: SETTINGS (Admin Profile) */}
          {activeTab === "settings" && (
            <div className="max-w-2xl animate-fade-in space-y-6">
              <h4 className="font-bold text-dark-900 mb-4">
                Admin Profile Settings
              </h4>
              <form
                onSubmit={handleProfileSubmit}
                className="bg-gray-50 border border-gray-150 rounded-2xl p-6 space-y-5"
              >
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) =>
                      setProfile({ ...profile, email: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                    New Password{" "}
                    <span className="text-gray-400 font-normal lowercase">
                      (leave blank to keep current)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type={showProfilePassword ? "text" : "password"}
                      value={profile.password}
                      onChange={(e) =>
                        setProfile({ ...profile, password: e.target.value })
                      }
                      className="w-full px-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowProfilePassword(!showProfilePassword)
                      }
                      className="absolute right-3 top-3 text-gray-400 hover:text-tomato-500 transition-colors"
                    >
                      {showProfilePassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="tomato-btn w-full md:w-auto py-2.5 px-6"
                  >
                    {loading ? "Updating..." : "Update Profile"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {/* Modal: Pending Teachers */}
      <Modal
        isOpen={isPendingTeacherModalOpen}
        onClose={() => setIsPendingTeacherModalOpen(false)}
        title="Pending Teacher Approvals"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {teachers.filter((t) => t.status === "pending").length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              No pending teachers.
            </p>
          ) : (
            teachers
              .filter((t) => t.status === "pending")
              .map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex justify-between items-center bg-gray-50 border border-gray-200 p-4 rounded-xl"
                >
                  <div>
                    <h5 className="font-bold text-dark-900 text-sm">
                      {teacher.name}
                    </h5>
                    <p className="text-xs text-gray-500">{teacher.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleUpdateTeacherStatus(teacher.id, "pending")
                      }
                      className="bg-green-100 text-green-700 p-2 rounded-lg hover:bg-green-200"
                      title="Approve"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTeacher(teacher.id)}
                      className="bg-red-100 text-red-700 p-2 rounded-lg hover:bg-red-200"
                      title="Reject"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </Modal>

      {/* Modal: Add Admin */}
      <Modal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        title="Add New Admin"
      >
        <form onSubmit={handleAddAdmin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
              Full Name
            </label>
            <input
              type="text"
              required
              value={adminForm.name}
              onChange={(e) =>
                setAdminForm({ ...adminForm, name: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-xl text-sm focus:border-tomato-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
              Email Address
            </label>
            <input
              type="email"
              required
              value={adminForm.email}
              onChange={(e) =>
                setAdminForm({ ...adminForm, email: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-xl text-sm focus:border-tomato-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
              Password
            </label>
            <div className="relative">
              <input
                type={showAdminPassword ? "text" : "password"}
                required
                value={adminForm.password}
                onChange={(e) =>
                  setAdminForm({ ...adminForm, password: e.target.value })
                }
                className="w-full px-3 pr-10 py-2 border rounded-xl text-sm focus:border-tomato-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowAdminPassword(!showAdminPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-tomato-500"
              >
                {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" className="tomato-btn w-full py-2.5 mt-2">
            Add Admin
          </button>
        </form>
      </Modal>
      {/* Modal: Add Student */}
      <Modal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        title="Add New Student"
      >
        <form onSubmit={handleAddStudent} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
              Student ID
            </label>
            <input
              type="text"
              required
              value={studentForm.id}
              onChange={(e) =>
                setStudentForm({ ...studentForm, id: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
              Full Name
            </label>
            <input
              type="text"
              required
              value={studentForm.name}
              onChange={(e) =>
                setStudentForm({ ...studentForm, name: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
              Email Address
            </label>
            <input
              type="email"
              required
              value={studentForm.email}
              onChange={(e) =>
                setStudentForm({ ...studentForm, email: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
              Password
            </label>
            <div className="relative">
              <input
                type={showStudentPassword ? "text" : "password"}
                required
                value={studentForm.password}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, password: e.target.value })
                }
                className="w-full px-3 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500"
              />
              <button
                type="button"
                onClick={() => setShowStudentPassword(!showStudentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-tomato-500"
              >
                {showStudentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" className="tomato-btn w-full py-2.5 text-sm">
              Add Student
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Teacher */}
      <Modal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        title="Add New Teacher"
      >
        <form onSubmit={handleAddTeacher} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
              Full Name
            </label>
            <input
              type="text"
              required
              value={teacherForm.name}
              onChange={(e) =>
                setTeacherForm({ ...teacherForm, name: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
              Email Address
            </label>
            <input
              type="email"
              required
              value={teacherForm.email}
              onChange={(e) =>
                setTeacherForm({ ...teacherForm, email: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
              Password
            </label>
            <div className="relative">
              <input
                type={showTeacherPassword ? "text" : "password"}
                required
                value={teacherForm.password}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, password: e.target.value })
                }
                className="w-full px-3 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tomato-500"
              />
              <button
                type="button"
                onClick={() => setShowTeacherPassword(!showTeacherPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-tomato-500"
              >
                {showTeacherPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" className="tomato-btn w-full py-2.5 mt-2">
            Submit (Approve Directly)
          </button>
        </form>
      </Modal>

      {/* Student Exams Modal */}
      <Modal
        isOpen={!!selectedStudentForModal}
        onClose={handleCloseModal}
        title={
          selectedStudentForModal
            ? `Exams for ${selectedStudentForModal.name}`
            : ""
        }
      >
        <div className="space-y-4">
          {loadingStudentExams ? (
            <p className="text-sm text-gray-500 text-center py-4">Loading exams...</p>
          ) : studentExamDetails.length > 0 ? (
            <div className="max-h-80 overflow-y-auto pr-2">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-bold">Exam Title</th>
                    <th className="px-4 py-3 font-bold">Date Finished</th>
                    <th className="px-4 py-3 font-bold text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {studentExamDetails.map((exam, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-dark-900">{exam.title}</td>
                      <td className="px-4 py-3 text-xs">{new Date(exam.finished_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right font-bold text-tomato-500">{exam.score}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No completed exams found.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
