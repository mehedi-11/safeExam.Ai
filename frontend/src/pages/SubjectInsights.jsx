import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Award, AlertTriangle, CheckCircle2, 
  Target, Search, RefreshCw, 
  CheckSquare, Square, BarChart3, 
  ShieldCheck, ChevronRight, GraduationCap,
  Clock, Lightbulb, Brain, BookOpen
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
  const [, setProfile] = useState(propProfile || null);
  const [loading, setLoading] = useState(!propExams);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'strengths', 'moderate', 'attention'
  const [selectedSubjectModal, setSelectedSubjectModal] = useState(null);

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [exRes, pRes] = await Promise.all([
        api.get('/student/exams'),
        api.get('/student/profile')
      ]);
      setExams(exRes.data || []);
      setProfile(pRes.data || null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Error loading insights data:", err);
    } finally {
      setLoading(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (propExams) {
      setExams(propExams);
    }
  }, [propExams]);

  useEffect(() => {
    if (propProfile) {
      setProfile(propProfile);
    }
  }, [propProfile]);

  useEffect(() => {
    if (!propExams) {
      fetchData();
    }
  }, [propExams, fetchData]);

  // Process subject analytics based on student's actual exam performance
  const analytics = useMemo(() => {
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

      // Grade calculation based on score thresholds
      let grade = 'N/A';
      let status = 'unattempted'; // 'strength', 'moderate', 'attention', 'unattempted'

      if (hasScores) {
        if (avgPercentage >= 85) { grade = 'A+'; status = 'strength'; }
        else if (avgPercentage >= 75) { grade = 'A'; status = 'strength'; }
        else if (avgPercentage >= 65) { grade = 'B'; status = 'moderate'; }
        else if (avgPercentage >= 50) { grade = 'C'; status = 'moderate'; }
        else { grade = 'F'; status = 'attention'; }
      }

      // Condition-based customized study recommendations based on student's marks
      let recommendations = [];
      let focusTopics = [];

      if (!hasScores) {
        recommendations = [
          `Upcoming Subject: No exams have been completed yet in ${subj.name}.`,
          "Review the course syllabus and exam structure thoroughly to prepare in advance.",
          "Familiarize yourself with the exam duration, total questions, and proctoring rules before starting."
        ];
        focusTopics = ["Course Syllabus Review", "Sample Question Formats", "Time Management"];
      } else if (avgPercentage >= 85) {
        recommendations = [
          `Mastery Demonstrated (${avgPercentage.toFixed(1)}% Avg): Outstanding conceptual clarity in ${subj.name}.`,
          "Tackle advanced analytical question sets and higher-order critical thinking problems.",
          "Dedicate one session weekly to active recall and timed problem-solving to maintain your edge.",
          "Help peers or explain complex solutions aloud to solidify memory permanence."
        ];
        focusTopics = ["Advanced Analytical Problems", "Speed & Accuracy Optimization", "Comprehensive Review"];
      } else if (avgPercentage >= 75) {
        recommendations = [
          `Strong Performance (${avgPercentage.toFixed(1)}% Avg): Solid conceptual foundation in ${subj.name}.`,
          "Analyze previous test questions to identify minor errors that prevented scoring above 85%.",
          "Focus on multi-step derivations, edge cases, and tricky multiple-choice options.",
          "Take regular timed mock quizzes under exam conditions to boost speed."
        ];
        focusTopics = ["Edge Cases & Nuances", "Complex Multi-Step Problems", "Timed Mock Drills"];
      } else if (avgPercentage >= 60) {
        recommendations = [
          `Moderate Proficiency (${avgPercentage.toFixed(1)}% Avg): Good understanding of core concepts with room for growth.`,
          "Pinpoint recurring mistake patterns: Check if marks were lost due to tricky wording or rush near the end.",
          "Implement spaced repetition: Create summary sheets or flashcards for definitions and key formulas.",
          "Complete at least 1-2 timed practice tests before your next scheduled exam."
        ];
        focusTopics = ["Tricky Conceptual Areas", "Formula Cheat Sheets", "Exam Pacing & Time Management"];
      } else if (avgPercentage >= 50) {
        recommendations = [
          `Passing but Needs Improvement (${avgPercentage.toFixed(1)}% Avg): Several important knowledge gaps exist in ${subj.name}.`,
          "Break daily study sessions into focused 30-minute revision blocks to avoid overwhelm.",
          "Review lecture recordings or textbook chapters for low-scoring questions from past exams.",
          "Re-attempt every incorrect exam problem without looking at solutions until solved correctly."
        ];
        focusTopics = ["Foundational Concepts", "High-Weightage Chapters", "Previous Mistakes Review"];
      } else {
        recommendations = [
          `Urgent Focus Required (${avgPercentage.toFixed(1)}% Avg): Current score is below passing standard in ${subj.name}.`,
          "Schedule consultation hours with your course instructor to address core roadblocks immediately.",
          "Rebuild fundamentals from scratch: Focus on high-frequency, fundamental exam topics first.",
          "Re-solve all previous exam questions step-by-step until you master each question type.",
          "Ensure complete focus during exams: Avoid distractions and maintain calm, steady pacing."
        ];
        focusTopics = ["Basic Definitions & Laws", "High-Yield Practice Questions", "Direct Instructor Guidance"];
      }

      return {
        ...subj,
        avgPercentage: parseFloat(avgPercentage.toFixed(1)),
        highestScore: parseFloat(highestScore.toFixed(1)),
        lowestScore: parseFloat(lowestScore.toFixed(1)),
        grade,
        status,
        recommendations,
        focusTopics
      };
    }).sort((a, b) => {
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

  // Filtered subjects based on search & pill filter
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
          label: 'Pending Exams'
        };
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      {/* Hero / Header Section */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-tomato-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tomato-500/20 border border-tomato-500/30 text-tomato-300 text-xs font-bold uppercase tracking-wider">
              <BarChart3 size={14} className="text-tomato-400" />
              <span>Subject Performance & Performance Insights</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Subject Insights & Recommendations
            </h1>
            <p className="text-gray-300 text-sm leading-relaxed">
              Real-time analytics evaluated from your actual exam scores. Track your performance per subject, pinpoint your strongest areas, identify learning bottlenecks, and follow targeted score-improvement recommendations.
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
              <span className="text-[11px] font-bold uppercase tracking-wider">Overall Average</span>
              <Award size={16} className="text-tomato-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{analytics.overallAvg}%</span>
              <span className="text-[11px] font-semibold text-gray-400">Avg Score</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Strong Subjects</span>
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400">{analytics.strengthsCount}</span>
              <span className="text-[11px] font-semibold text-gray-400">Score ≥ 75%</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Need Attention</span>
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-red-400">{analytics.attentionCount}</span>
              <span className="text-[11px] font-semibold text-gray-400">Score &lt; 50%</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Proctor Integrity</span>
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
                ≥ 75% Strong
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                50-74% Moderate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                &lt; 50% Needs Focus
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
              {analytics.strengthsCount === 0 ? (
                <p className="text-xs text-emerald-700/80">No subjects above 75% yet. Keep practicing to reach distinction!</p>
              ) : (
                <div className="space-y-2 mt-3">
                  {analytics.evaluatedSubjects
                    .filter(s => s.status === 'strength')
                    .slice(0, 3)
                    .map(s => (
                      <div key={s.name} className="flex items-center justify-between text-xs bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                        <span className="font-bold text-gray-800 truncate mr-2">{s.name}</span>
                        <span className="font-black text-emerald-600 shrink-0">{s.avgPercentage}%</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Attention Required Card */}
            <div className="bg-red-50/60 border border-red-200/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-red-800 font-bold text-sm">
                <AlertTriangle size={18} className="text-red-600" />
                <h4>Subjects Needing Focus</h4>
              </div>
              {analytics.attentionCount === 0 && analytics.moderateCount === 0 ? (
                <p className="text-xs text-emerald-700">All evaluated subjects are in the strong mastery zone!</p>
              ) : (
                <div className="space-y-2 mt-3">
                  {analytics.evaluatedSubjects
                    .filter(s => s.status === 'attention' || s.status === 'moderate')
                    .sort((a, b) => a.avgPercentage - b.avgPercentage)
                    .slice(0, 3)
                    .map(s => (
                      <div key={s.name} className="flex items-center justify-between text-xs bg-white/80 p-2.5 rounded-xl border border-red-100">
                        <span className="font-bold text-gray-800 truncate mr-2">{s.name}</span>
                        <span className={`font-black shrink-0 ${s.status === 'attention' ? 'text-red-600' : 'text-amber-600'}`}>
                          {s.avgPercentage}%
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Study Streak / Motivation Tip */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-tomato-500/20 text-tomato-400 flex items-center justify-center shrink-0 border border-tomato-500/30">
                <Brain size={20} />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Study Habit Tip</p>
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
              Complete your scheduled exams and wait for instructor result publication. Once grades are published, detailed subject analytics and grade estimates will populate automatically.
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
            { id: 'strengths', label: 'Strong (≥75%)' },
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
            <span>Subject-by-Subject Exam Breakdown & Recommendations</span>
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
                    {/* Header: Name, Code & Badge */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-gray-400 uppercase tracking-wider">{subject.code}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${styling.badge}`}>
                            {styling.label}
                          </span>
                        </div>
                        <h4 className="text-base font-black text-gray-900 mt-1 leading-snug">
                          {subject.name}
                        </h4>
                      </div>

                      {/* Grade Pill */}
                      <div className="text-right">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-sm border ${styling.border} ${styling.bg} ${styling.text}`}>
                          {subject.grade}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar & Scores */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center text-xs font-bold text-gray-600">
                        <span>Average Score Progress</span>
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
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Average</span>
                        <span className="text-xs font-black text-gray-900">
                          {subject.scores.length > 0 ? `${subject.avgPercentage}%` : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Highest</span>
                        <span className="text-xs font-black text-gray-900">
                          {subject.scores.length > 0 ? `${subject.highestScore}%` : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Demerits</span>
                        <span className={`text-xs font-black ${subject.demerits > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {subject.demerits}
                        </span>
                      </div>
                    </div>

                    {/* Condition-based Recommendations Box */}
                    <div className={`p-4 rounded-xl border ${styling.border} ${styling.bg} space-y-2 mb-4`}>
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Lightbulb size={15} className={styling.text} />
                        <span className={styling.text}>Performance Suggestion:</span>
                      </div>
                      <ul className="text-xs space-y-1.5 text-gray-700">
                        {subject.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-gray-400 mt-1">•</span>
                            <span className="leading-relaxed">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Focus Topics Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Recommended Topics:</span>
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
                      <BookOpen size={14} />
                      <span>View Exam History & Study Checklist</span>
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
                  {selectedSubjectModal.code} • Subject Performance Roadmap
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
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Average Score</span>
                  <p className="text-lg font-black text-gray-900">{selectedSubjectModal.avgPercentage}%</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Exams Completed</span>
                  <p className="text-lg font-black text-gray-900">{selectedSubjectModal.completedExams} of {selectedSubjectModal.totalExams}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Grade</span>
                  <p className="text-lg font-black text-tomato-600">{selectedSubjectModal.grade}</p>
                </div>
              </div>

              {/* Personalized 3-Step Action Plan */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                  <Target size={18} className="text-tomato-500" />
                  <h4>Structured Study Checklist</h4>
                </div>
                <p className="text-xs text-gray-500">
                  Follow these structured milestones before your next exam. Check them off as you complete them!
                </p>

                <div className="space-y-2.5">
                  {[
                    {
                      id: `${selectedSubjectModal.code}_step_1`,
                      title: "Step 1: Error Analysis & Concept Review",
                      desc: "Re-examine incorrect problems from your past exams. Ensure fundamentals in high-weightage chapters are clear without looking at solutions.",
                      est: "45 mins"
                    },
                    {
                      id: `${selectedSubjectModal.code}_step_2`,
                      title: "Step 2: Timed Practice & Spaced Repetition",
                      desc: "Complete 15-20 timed questions under strict 30-minute test conditions. Review formula summary sheets.",
                      est: "30 mins"
                    },
                    {
                      id: `${selectedSubjectModal.code}_step_3`,
                      title: "Step 3: Exam Readiness & Integrity Check",
                      desc: "Verify webcam illumination, clear workspace of unauthorized material, and perform a dry-run test to minimize demerit flags.",
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
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-900">
                      <tr>
                        <th className="p-3 font-bold text-left">Exam Title</th>
                        <th className="p-3 font-bold text-left">Status</th>
                        <th className="p-3 font-bold text-left">Score</th>
                        <th className="p-3 font-bold text-left">Demerits</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedSubjectModal.examsList.map((exam, i) => {
                        const isDone = exam.exam_status === 'completed';
                        return (
                          <tr key={i} className="hover:bg-gray-50/60">
                            <td className="p-3 font-semibold text-gray-900">
                              {exam.title}
                              {exam.exam_date && (
                                <span className="block text-[10px] text-gray-400 font-normal">
                                  {new Date(exam.exam_date).toLocaleDateString()}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isDone 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-gray-100 text-gray-600 border border-gray-200'
                              }`}>
                                {isDone ? 'Completed' : 'Upcoming / Pending'}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-gray-900">
                              {isDone && exam.results_published ? (
                                <span className="text-tomato-600 font-black">
                                  {exam.score} / {exam.total_marks || 100}
                                </span>
                              ) : isDone ? (
                                <span className="text-gray-400">Under Review</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`font-bold ${Number(exam.demerit_points || 0) > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                {exam.demerit_points || 0}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedSubjectModal(null)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
