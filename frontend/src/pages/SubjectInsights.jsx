import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, TrendingUp, Award, AlertTriangle, CheckCircle2, 
  BookOpen, Target, Brain, Search, RefreshCw, 
  ArrowUpRight, CheckSquare, Square, Lightbulb, BarChart3, 
  ShieldCheck, ShieldAlert, ChevronRight, GraduationCap,
  Calendar, FileText, ArrowRight, Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import api from '../api/axiosConfig';

export default function SubjectInsights({ exams: propExams, profile: propProfile, onRefresh }) {
  const [exams, setExams] = useState(propExams || []);
  const [profile, setProfile] = useState(propProfile || {});
  const [loading, setLoading] = useState(!propExams);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'strengths', 'moderate', 'attention'
  const [selectedSubjectModal, setSelectedSubjectModal] = useState(null);

  // Agent ELI Diagnostic State
  const [aiAnalysis, setAiAnalysis] = useState(() => {
    try {
      const cached = localStorage.getItem('safeexam_eli_analysis');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const runEliAnalysis = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const res = await api.get('/student/ai-insights');
      if (res.data?.analysis) {
        setAiAnalysis(res.data.analysis);
        try {
          localStorage.setItem('safeexam_eli_analysis', JSON.stringify(res.data.analysis));
        } catch (e) {
          console.error(e);
        }
      } else {
        setAiError('Could not retrieve ELI diagnostic data.');
      }
    } catch (err) {
      console.error('ELI Analysis Error:', err);
      setAiError(err.response?.data?.message || 'Failed to connect to Agent ELI diagnostic service.');
    } finally {
      setAiLoading(false);
    }
  };
  
  // Interactive study checklist state persisted in localStorage
  const [completedGoals, setCompletedGoals] = useState(() => {
    try {
      const saved = localStorage.getItem('safeexam_study_goals');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleGoal = (goalId) => {
    setCompletedGoals(prev => {
      const updated = { ...prev, [goalId]: !prev[goalId] };
      try {
        localStorage.setItem('safeexam_study_goals', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  // Sync props if provided
  useEffect(() => {
    if (propExams) setExams(propExams);
  }, [propExams]);

  useEffect(() => {
    if (propProfile) setProfile(propProfile);
  }, [propProfile]);

  // Fetch data if standalone
  useEffect(() => {
    if (!propExams) {
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [exRes, pRes] = await Promise.all([
        api.get('/student/exams'),
        api.get('/student/profile')
      ]);
      setExams(exRes.data || []);
      setProfile(pRes.data || {});
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Error loading insights data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Process subject analytics
  const analytics = useMemo(() => {
    // Group all exams by subject
    const subjectMap = {};

    exams.forEach(exam => {
      const subjectName = (exam.course_name || exam.course_code || 'General Studies').trim();
      const code = exam.course_code || 'GEN-101';

      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = {
          name: subjectName,
          code: code,
          totalExams: 0,
          completedExams: 0,
          pendingExams: 0,
          scores: [],
          demerits: 0,
          examsList: []
        };
      }

      subjectMap[subjectName].totalExams += 1;
      subjectMap[subjectName].examsList.push(exam);

      const isCompleted = exam.exam_status === 'completed' && exam.score !== null && !isNaN(exam.score) && exam.results_published;

      if (isCompleted) {
        const maxMarks = exam.total_marks || 100;
        const pct = (Number(exam.score) / maxMarks) * 100;
        subjectMap[subjectName].completedExams += 1;
        subjectMap[subjectName].scores.push({
          title: exam.title,
          score: Number(exam.score),
          maxMarks: maxMarks,
          percentage: pct,
          demerits: exam.demerit_points || 0,
          date: exam.finished_at || exam.started_at || exam.exam_date
        });
        subjectMap[subjectName].demerits += (exam.demerit_points || 0);
      } else {
        subjectMap[subjectName].pendingExams += 1;
      }
    });

    const subjectsList = Object.values(subjectMap).map(subj => {
      const hasScores = subj.scores.length > 0;
      const avgPercentage = hasScores
        ? subj.scores.reduce((sum, s) => sum + s.percentage, 0) / subj.scores.length
        : 0;

      const highestScore = hasScores
        ? Math.max(...subj.scores.map(s => s.percentage))
        : 0;

      const lowestScore = hasScores
        ? Math.min(...subj.scores.map(s => s.percentage))
        : 0;

      // Determine grade letter and status
      let grade = 'N/A';
      let status = 'unattempted'; // 'strength', 'moderate', 'attention', 'unattempted'

      if (hasScores) {
        if (avgPercentage >= 85) { grade = 'A+'; status = 'strength'; }
        else if (avgPercentage >= 75) { grade = 'A'; status = 'strength'; }
        else if (avgPercentage >= 65) { grade = 'B'; status = 'moderate'; }
        else if (avgPercentage >= 50) { grade = 'C'; status = 'moderate'; }
        else { grade = 'F'; status = 'attention'; }
      }

      // Generate personalized AI suggestions
      let aiRecommendations = [];
      let focusTopics = [];

      if (!hasScores) {
        aiRecommendations = [
          "Take your upcoming exams in this course to establish a baseline proficiency score.",
          "Review the course syllabus and exam format beforehand to be fully prepared.",
          "Familiarize yourself with SafeExam.AI proctoring rules before starting."
        ];
        focusTopics = ["Core Course Syllabus", "Practice Quiz Format", "Time Management"];
      } else if (status === 'strength') {
        aiRecommendations = [
          `Mastery Demonstrated (${avgPercentage.toFixed(1)}% Avg): You have a solid conceptual foundation in ${subj.name}.`,
          "Deepen your expertise by tackling advanced, analytical question types and timed problem sets.",
          "Maintain your sharp edge: dedicate 1 session/week to active recall rather than passive re-reading.",
          "Consider tutoring or discussing edge-case questions with peers to reinforce memory permanence."
        ];
        focusTopics = ["Advanced Analytical Problems", "Speed Optimization", "Comprehensive Review"];
      } else if (status === 'moderate') {
        aiRecommendations = [
          `Solid Fundamentals with Growth Potential (${avgPercentage.toFixed(1)}% Avg): You understand the core ideas of ${subj.name}, but score variance occurs.`,
          "Review past exam errors: analyze whether marks were lost to tricky questions or time pressure.",
          "Implement Spaced Repetition: make flashcards or summary cheat sheets for definitions and formulas.",
          "Attempt 1 full timed mock exam under strict proctored conditions before the next test."
        ];
        focusTopics = ["Tricky Conceptual Areas", "Exam Pacing & Time Limits", "Formula Cheat Sheets"];
      } else {
        aiRecommendations = [
          `Urgent Focus Required (${avgPercentage.toFixed(1)}% Avg): Your current score indicates difficulties in ${subj.name}.`,
          "Immediate Revision Plan: Break down the course into 30-minute daily chunks to avoid overwhelm.",
          "Reach out to your course instructor during office hours to clarify foundational roadblocks.",
          "Re-attempt every question you missed on previous exams until you can solve them without hints.",
          "Ensure complete focus during exams: maintain steady webcam positioning to avoid integrity demerit penalties."
        ];
        focusTopics = ["Foundational Concepts", "High-Weightage Chapters", "Previous Exam Mistakes Review"];
      }

      return {
        ...subj,
        avgPercentage: parseFloat(avgPercentage.toFixed(1)),
        highestScore: parseFloat(highestScore.toFixed(1)),
        lowestScore: parseFloat(lowestScore.toFixed(1)),
        grade,
        status,
        aiRecommendations,
        focusTopics
      };
    }).sort((a, b) => {
      // Sort completed higher, then by average descending
      if (b.scores.length !== a.scores.length) return b.scores.length - a.scores.length;
      return b.avgPercentage - a.avgPercentage;
    });

    const evaluatedSubjects = subjectsList.filter(s => s.scores.length > 0);
    const overallAvg = evaluatedSubjects.length > 0
      ? (evaluatedSubjects.reduce((sum, s) => sum + s.avgPercentage, 0) / evaluatedSubjects.length).toFixed(1)
      : 0;

    const strengthsCount = evaluatedSubjects.filter(s => s.status === 'strength').length;
    const attentionCount = evaluatedSubjects.filter(s => s.status === 'attention').length;
    const moderateCount = evaluatedSubjects.filter(s => s.status === 'moderate').length;

    const totalDemerits = subjectsList.reduce((sum, s) => sum + s.demerits, 0);

    return {
      subjectsList,
      evaluatedSubjects,
      overallAvg: parseFloat(overallAvg),
      strengthsCount,
      attentionCount,
      moderateCount,
      totalDemerits
    };
  }, [exams]);

  // Filtered subjects
  const filteredSubjects = useMemo(() => {
    return analytics.subjectsList.filter(subject => {
      const matchesSearch = 
        subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.code.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'strengths') return subject.status === 'strength';
      if (selectedFilter === 'moderate') return subject.status === 'moderate';
      if (selectedFilter === 'attention') return subject.status === 'attention';
      if (selectedFilter === 'pending') return subject.pendingExams > 0;
      return true;
    });
  }, [analytics.subjectsList, searchQuery, selectedFilter]);

  // Chart data for subjects
  const chartData = useMemo(() => {
    return analytics.evaluatedSubjects.map(s => ({
      name: s.name.length > 14 ? s.name.substring(0, 12) + '...' : s.name,
      fullName: s.name,
      code: s.code,
      average: s.avgPercentage,
      status: s.status
    }));
  }, [analytics.evaluatedSubjects]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'strength':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-700',
          badge: 'bg-emerald-100 text-emerald-800',
          bar: '#10b981',
          label: 'Mastered'
        };
      case 'moderate':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          badge: 'bg-amber-100 text-amber-800',
          bar: '#f59e0b',
          label: 'Proficient'
        };
      case 'attention':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          badge: 'bg-red-100 text-red-800',
          bar: '#ef4444',
          label: 'Needs Focus'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-700',
          badge: 'bg-gray-100 text-gray-700',
          bar: '#9ca3af',
          label: 'Pending Data'
        };
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      {/* Hero / Header Section */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-tomato-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tomato-500/20 border border-tomato-500/30 text-tomato-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} className="text-tomato-400 animate-pulse" />
              <span>AI Academic Diagnostics & Insights</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Subject Insights & Intelligent Suggestions
            </h1>
            <p className="text-gray-300 text-sm leading-relaxed">
              Real-time analytics evaluated from your proctored exams. Pinpoint your strongest subjects, identify learning gaps early, and follow tailored AI recommendations to optimize your scores.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-stretch md:self-auto justify-end">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-xs font-bold border border-white/15 transition-all shadow-sm"
              title="Refresh Analytics"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>Refresh Insights</span>
            </button>
          </div>
        </div>

        {/* Global KPI Highlights */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Mastery Rate</span>
              <Award size={16} className="text-tomato-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{analytics.overallAvg}%</span>
              <span className="text-[11px] font-semibold text-gray-400">Avg Score</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Top Strengths</span>
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400">{analytics.strengthsCount}</span>
              <span className="text-[11px] font-semibold text-gray-400">Subjects ≥ 75%</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Focus Areas</span>
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-red-400">{analytics.attentionCount}</span>
              <span className="text-[11px] font-semibold text-gray-400">Need Attention</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Proctor Health</span>
              <ShieldCheck size={16} className="text-tomato-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">
                {analytics.totalDemerits === 0 ? '100%' : `${Math.max(0, 100 - analytics.totalDemerits * 10)}%`}
              </span>
              <span className="text-[11px] font-semibold text-gray-400">
                {analytics.totalDemerits} Demerits
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Agent ELI Deep Problem & Behavioral Analyzer Card */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-lg shadow-gray-200/50 space-y-6 relative overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-gray-900 to-gray-800 text-tomato-400 flex items-center justify-center shrink-0 shadow-md shadow-tomato-500/10 border border-gray-700">
              <Brain size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-gray-900">Agent ELI • Academic Diagnostic Analyzer</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-tomato-50 text-tomato-700 border border-tomato-200 uppercase tracking-wider">
                  Agent ELI
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Cognitive evaluation of study bottlenecks, exam pacing traps, and targeted recovery roadmap by ELI
              </p>
            </div>
          </div>

          <button
            onClick={runEliAnalysis}
            disabled={aiLoading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-gray-900/10 disabled:opacity-60 disabled:cursor-not-allowed group shrink-0"
          >
            <Sparkles size={15} className={`text-tomato-400 group-hover:rotate-12 transition-transform ${aiLoading ? 'animate-spin' : ''}`} />
            <span>{aiLoading ? 'Agent ELI is Analyzing...' : aiAnalysis ? 'Re-analyze with ELI' : 'Consult Agent ELI'}</span>
          </button>
        </div>

        {/* AI Loading State */}
        {aiLoading && (
          <div className="py-12 px-4 text-center space-y-4 animate-fade-in bg-gray-50/60 rounded-2xl border border-gray-200/70">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-tomato-100 border-t-tomato-500 animate-spin" />
              <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center text-gray-900 shadow-sm">
                <Brain size={24} className="text-tomato-500" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-gray-900">Agent ELI is Diagnosing Your Exams...</h4>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Correlating exam scores, topic errors, proctoring health, and calculating custom recovery milestones.
              </p>
            </div>
          </div>
        )}

        {/* AI Error */}
        {aiError && !aiLoading && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{aiError}</span>
          </div>
        )}

        {/* AI Report Content */}
        {aiAnalysis && !aiLoading && (
          <div className="space-y-6 animate-fade-in">
            {/* Overview & Risk Rating */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
              <div className="md:col-span-8 bg-gray-50 p-5 rounded-2xl border border-gray-200/80 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Diagnostic Summary</span>
                <p className="text-xs md:text-sm text-gray-800 leading-relaxed font-medium">
                  {aiAnalysis.summary}
                </p>
                {aiAnalysis.riskDescription && (
                  <p className="text-xs text-gray-600 font-normal">
                    {aiAnalysis.riskDescription}
                  </p>
                )}
              </div>

              <div className={`md:col-span-4 p-5 rounded-2xl border flex flex-col justify-between ${
                aiAnalysis.riskLevel === 'High' 
                  ? 'bg-red-50 border-red-200 text-red-900' 
                  : aiAnalysis.riskLevel === 'Moderate'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">Grade Drop Risk</span>
                  <h4 className="text-2xl font-black mt-1">
                    {aiAnalysis.riskLevel || 'Low'} Risk
                  </h4>
                </div>
                <p className="text-[11px] opacity-80 mt-2">
                  {aiAnalysis.riskLevel === 'High' 
                    ? 'Immediate structured revision needed to protect overall GPA.'
                    : aiAnalysis.riskLevel === 'Moderate'
                    ? 'Target weak topics to maintain consistent grade trajectory.'
                    : 'Performance is on track. Keep up the high standard!'}
                </p>
              </div>
            </div>

            {/* Detected Problems & Root Causes */}
            {aiAnalysis.detectedProblems && aiAnalysis.detectedProblems.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <AlertTriangle size={15} className="text-amber-500" />
                  <span>Detected Learning Problems & Root Causes</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiAnalysis.detectedProblems.map((prob, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 font-bold text-[10px] uppercase">
                          {prob.subject}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          prob.severity === 'Critical' 
                            ? 'bg-red-100 text-red-700' 
                            : prob.severity === 'Moderate'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {prob.severity || 'Moderate'}
                        </span>
                      </div>
                      
                      <div>
                        <p className="text-xs font-bold text-gray-900">⚠️ {prob.issue}</p>
                        <p className="text-xs text-gray-600 mt-1 pl-4 border-l-2 border-tomato-300 leading-relaxed">
                          <strong className="text-gray-900 font-semibold">Root Cause: </strong>
                          {prob.rootCause}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Time-Pacing & Behavioral Insights */}
            {aiAnalysis.timeAndBehavioralInsights && (
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-600 shrink-0">
                  <Clock size={16} />
                </div>
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-blue-900 block">Exam Time Management & Focus Analysis</span>
                  <p className="text-blue-800/90 leading-relaxed font-medium">
                    {aiAnalysis.timeAndBehavioralInsights}
                  </p>
                </div>
              </div>
            )}

            {/* 7-Day Remedial Roadmap */}
            {aiAnalysis.remedialRoadmap && aiAnalysis.remedialRoadmap.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Target size={15} className="text-tomato-500" />
                  <span>Personalized 3-Phase Recovery Roadmap</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {aiAnalysis.remedialRoadmap.map((step, idx) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2">
                      <span className="px-2 py-0.5 rounded-md bg-gray-900 text-white font-extrabold text-[10px]">
                        {step.phase || `Phase ${idx + 1}`}
                      </span>
                      <h5 className="text-xs font-bold text-gray-900">{step.focus}</h5>
                      <p className="text-xs text-gray-600 leading-relaxed">{step.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Tips */}
            {aiAnalysis.quickTips && aiAnalysis.quickTips.length > 0 && (
              <div className="p-4 rounded-2xl bg-gray-900 text-white space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-tomato-400">
                  <Lightbulb size={14} />
                  <span>Agent ELI's High-Impact Revision Strategies</span>
                </div>
                <ul className="text-xs text-gray-300 space-y-1 pl-4 list-disc">
                  {aiAnalysis.quickTips.map((tip, i) => (
                    <li key={i} className="leading-relaxed">{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Empty state when not analyzed yet */}
        {!aiAnalysis && !aiLoading && (
          <div className="py-6 px-4 bg-gray-50 rounded-2xl border border-gray-200/80 text-center space-y-2">
            <p className="text-xs text-gray-600 font-medium">
              Click <strong className="text-gray-900">"Consult Agent ELI"</strong> to launch deep cognitive analysis. Agent ELI will detect root causes of mistakes and formulate a step-by-step recovery plan.
            </p>
          </div>
        )}
      </div>

      {/* Visual Analytics Row: Chart + Strengths & Growth Areas */}
      {analytics.evaluatedSubjects.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recharts Subject Performance Bar Chart */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 p-6 shadow-md shadow-gray-200/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-tomato-50 text-tomato-500 border border-tomato-100">
                    <BarChart3 size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm md:text-base">Subject Score Comparison (%)</h3>
                    <p className="text-xs text-gray-500">Benchmark comparison against 75% distinction target</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {analytics.evaluatedSubjects.length} Evaluated
                </span>
              </div>

              <div className="h-64 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-gray-900 text-white p-3 rounded-xl shadow-xl border border-gray-700 text-xs space-y-1">
                              <p className="font-bold text-tomato-400">{data.fullName}</p>
                              <p className="text-gray-300">Code: <span className="font-semibold text-white">{data.code}</span></p>
                              <p className="text-gray-300">Score Average: <span className="font-black text-white">{data.average}%</span></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="average" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={
                            entry.status === 'strength' 
                              ? '#10b981' 
                              : entry.status === 'moderate' 
                              ? '#f59e0b' 
                              : '#ef4444'
                          } 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-100 text-xs font-semibold text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                ≥ 75% Distinction
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                50-74% Competent
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                &lt; 50% Needs Help
              </span>
            </div>
          </div>

          {/* Quick Summary Cards (Strengths & Urgent Action) */}
          <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
            {/* Strengths Card */}
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <h4>Strongest Performers</h4>
              </div>
              <p className="text-xs text-emerald-700/80 mb-3">Subjects where you are currently scoring above benchmark:</p>
              {analytics.strengthsCount > 0 ? (
                <div className="space-y-2">
                  {analytics.evaluatedSubjects
                    .filter(s => s.status === 'strength')
                    .map(s => (
                      <div key={s.name} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-emerald-200 text-xs shadow-2xs">
                        <span className="font-bold text-gray-900 truncate max-w-[150px]">{s.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-emerald-600">{s.avgPercentage}%</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">{s.grade}</span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-3 bg-white/60 rounded-xl text-center text-xs text-gray-500">
                  No subjects above 75% yet. Keep practicing!
                </div>
              )}
            </div>

            {/* Growth Areas Card */}
            <div className="bg-red-50/60 border border-red-200/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-red-800 font-bold text-sm">
                <AlertTriangle size={18} className="text-red-600" />
                <h4>Critical Focus Needed</h4>
              </div>
              <p className="text-xs text-red-700/80 mb-3">Courses requiring targeted intervention before finals:</p>
              {analytics.attentionCount > 0 ? (
                <div className="space-y-2">
                  {analytics.evaluatedSubjects
                    .filter(s => s.status === 'attention')
                    .map(s => (
                      <div key={s.name} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-red-200 text-xs shadow-2xs">
                        <span className="font-bold text-gray-900 truncate max-w-[150px]">{s.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-red-600">{s.avgPercentage}%</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-red-100 text-red-800 text-[10px] font-bold">{s.grade}</span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-3 bg-white/60 rounded-xl text-center text-xs text-emerald-700 font-medium">
                  🎉 Excellent! No subjects currently below 50%.
                </div>
              )}
            </div>

            {/* Study Streak / Motivation Tip */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-tomato-500/20 text-tomato-400 flex items-center justify-center shrink-0 border border-tomato-500/30">
                <Brain size={20} />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Daily Memory Tip</p>
                <p className="text-gray-300 text-[11px]">Testing yourself on tough topics produces 50% better retention than passive re-reading.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State when no exams have been graded yet */
        <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center shadow-md shadow-gray-200/50 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-tomato-50 text-tomato-500 mx-auto flex items-center justify-center border border-tomato-100">
            <GraduationCap size={32} />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-gray-900">Awaiting Exam Results</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Complete your scheduled exams and wait for instructor result publication. Once grades are published, detailed subject analytics, grade estimates, and AI study tips will populate automatically.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-md shadow-gray-200/50">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search subject by title or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-gray-900 focus:bg-white transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Subjects' },
            { id: 'strengths', label: 'Strengths (≥75%)' },
            { id: 'moderate', label: 'Moderate (50-74%)' },
            { id: 'attention', label: 'Needs Focus (<50%)' },
            { id: 'pending', label: 'Has Upcoming' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedFilter === filter.id
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200/60'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subject Detailed Diagnostic Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            <span>Subject-by-Subject Actionable Insights</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {filteredSubjects.length} found
            </span>
          </h3>
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500 text-xs">
            No subjects matched your search or selected filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSubjects.map(subject => {
              const styling = getStatusColor(subject.status);

              return (
                <div 
                  key={subject.name} 
                  className="bg-white rounded-2xl border border-gray-200 p-6 shadow-md shadow-gray-200/50 hover:border-gray-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Course Name, Code & Status Badge */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-extrabold uppercase tracking-wider">
                            {subject.code}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${styling.badge}`}>
                            {styling.label}
                          </span>
                        </div>
                        <h4 className="text-base font-black text-gray-900 leading-snug">
                          {subject.name}
                        </h4>
                      </div>

                      {/* Grade Badge */}
                      <div className="flex flex-col items-end shrink-0">
                        <span className={`text-xl font-black ${styling.text}`}>
                          {subject.scores.length > 0 ? `${subject.avgPercentage}%` : 'N/A'}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400">
                          Grade: {subject.grade}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 mb-5">
                      <div className="flex justify-between text-[11px] font-semibold text-gray-500">
                        <span>Mastery Progress</span>
                        <span>{subject.completedExams} of {subject.totalExams} Exams Graded</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min(100, subject.avgPercentage)}%`,
                            backgroundColor: styling.bar
                          }}
                        />
                      </div>
                    </div>

                    {/* Key Stats Row */}
                    <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100 text-center mb-5">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Highest</span>
                        <span className="text-xs font-black text-gray-900">
                          {subject.scores.length > 0 ? `${subject.highestScore}%` : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Lowest</span>
                        <span className="text-xs font-black text-gray-900">
                          {subject.scores.length > 0 ? `${subject.lowestScore}%` : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Demerits</span>
                        <span className={`text-xs font-black ${subject.demerits > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {subject.demerits}
                        </span>
                      </div>
                    </div>

                    {/* AI Suggestions Box */}
                    <div className={`p-4 rounded-xl border ${styling.border} ${styling.bg} space-y-2 mb-4`}>
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Lightbulb size={15} className={styling.text} />
                        <span className={styling.text}>AI Recommendation:</span>
                      </div>
                      <ul className="text-xs space-y-1.5 text-gray-700">
                        {subject.aiRecommendations.slice(0, 3).map((rec, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-gray-400 mt-1">•</span>
                            <span className="leading-relaxed">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Focus Topics Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Key Focus:</span>
                      {subject.focusTopics.map((topic, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-gray-700 text-[10px] font-semibold">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Button: View Full Course History & Roadmap */}
                  <div className="pt-4 border-t border-gray-100 mt-2">
                    <button
                      onClick={() => setSelectedSubjectModal(subject)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-gray-200 hover:border-gray-800 hover:bg-gray-900 hover:text-white text-xs font-bold text-gray-700 transition-all active:scale-98"
                    >
                      <span>Generate Actionable Study Plan</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Modal: Actionable Study Roadmap & Goal Tracker */}
      {selectedSubjectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gray-900 p-6 flex justify-between items-center text-white">
              <div>
                <span className="text-xs text-tomato-400 font-bold uppercase tracking-wider block">
                  {selectedSubjectModal.code} • Academic Roadmap
                </span>
                <h3 className="text-xl font-bold text-white">
                  {selectedSubjectModal.name}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedSubjectModal(null)} 
                className="hover:bg-white/20 p-2 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Overview Summary */}
              <div className="grid grid-cols-3 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Average</span>
                  <p className="text-lg font-black text-gray-900">{selectedSubjectModal.avgPercentage}%</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Completed</span>
                  <p className="text-lg font-black text-gray-900">{selectedSubjectModal.completedExams} Exams</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Target Rating</span>
                  <p className="text-lg font-black text-tomato-600">85%+ Goal</p>
                </div>
              </div>

              {/* Personalized 3-Step Action Plan */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                  <Target size={18} className="text-tomato-500" />
                  <h4>Personalized 3-Step Revision Roadmap</h4>
                </div>
                <p className="text-xs text-gray-500">
                  Follow these structured milestones before your next exam. Check them off as you complete them!
                </p>

                <div className="space-y-2.5">
                  {[
                    {
                      id: `${selectedSubjectModal.code}_step_1`,
                      title: "Step 1: Diagnostic Error Analysis & Concept Review",
                      desc: "Re-examine incorrect problems from your past exams. Ensure fundamentals in high-weightage chapters are clear without looking at solutions.",
                      est: "45 mins"
                    },
                    {
                      id: `${selectedSubjectModal.code}_step_2`,
                      title: "Step 2: Timed Practice & Flashcard Spaced Repetition",
                      desc: "Complete 15-20 timed questions under strict 30-minute test conditions. Review formula cheatsheet before sleeping.",
                      est: "30 mins"
                    },
                    {
                      id: `${selectedSubjectModal.code}_step_3`,
                      title: "Step 3: SafeExam Environment & Proctoring Readiness",
                      desc: "Verify webcam illumination, clear workspace of unauthorized material, and perform a dry-run test on SafeExam.AI to minimize demerit flags.",
                      est: "15 mins"
                    }
                  ].map(step => {
                    const isChecked = !!completedGoals[step.id];
                    return (
                      <div 
                        key={step.id}
                        onClick={() => toggleGoal(step.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isChecked 
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="mt-0.5 text-tomato-500">
                          {isChecked ? (
                            <CheckSquare size={20} className="text-emerald-600" />
                          ) : (
                            <Square size={20} className="text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${isChecked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                              {step.title}
                            </span>
                            <span className="text-[10px] font-semibold text-gray-400">{step.est}</span>
                          </div>
                          <p className={`text-xs mt-1 ${isChecked ? 'text-gray-400' : 'text-gray-600'}`}>
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Past Exam History in this Subject */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                  Recorded Exams in this Course ({selectedSubjectModal.examsList.length})
                </h4>

                <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="border-b border-gray-200 text-gray-900">
                      <tr>
                        <th className="p-3 font-bold text-left">Exam Title</th>
                        <th className="p-3 font-bold text-left">Status</th>
                        <th className="p-3 font-bold text-left">Score</th>
                        <th className="p-3 font-bold text-left">Demerits</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedSubjectModal.examsList
                        .slice()
                        .sort((a, b) => new Date(b.created_at || b.finished_at || 0) - new Date(a.created_at || a.finished_at || 0) || String(b._id || b.id || '').localeCompare(String(a._id || a.id || '')))
                        .map((ex, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="p-3 text-gray-900">{ex.title}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                              ex.exam_status === 'completed' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {ex.exam_status}
                            </span>
                          </td>
                          <td className="p-3 text-gray-900">
                            {ex.score !== null && !isNaN(ex.score) && ex.results_published
                              ? `${ex.score} / ${ex.total_marks || 100}`
                              : 'Pending'
                            }
                          </td>
                          <td className="p-3">
                            <span className={ex.demerit_points > 0 ? 'text-red-600' : 'text-gray-400'}>
                              {ex.demerit_points || 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedSubjectModal(null)}
                className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all"
              >
                Close Roadmap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
