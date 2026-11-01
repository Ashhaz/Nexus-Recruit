"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import CustomCursor from "@/components/ui/CustomCursor";
import AdminSidebar from "@/components/admin/AdminSidebar";
import EventWorkspaceBanner from "@/components/admin/EventWorkspaceBanner";
import { useEvent } from "@/context/EventContext";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Overview {
  total: number;
  waiting: number;
  interviewing: number;
  approved: number;
  pending: number;
  discussionNeeded: number;
}

interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
}

interface Insights {
  completed: number;
  approvalRate: number;
  completionRate: number;
  avgDurationSeconds: number;
  formattedAvgDuration: string;
  funnel: FunnelStage[];
}

interface TimeTrendPoint {
  date: string;
  count: number;
  cumulative: number;
}

interface DepartmentItem {
  name: string;
  count: number;
  approved: number;
  percentage: number;
  approvalRate: number;
}

interface StatusItem {
  status: string;
  count: number;
  percentage: number;
}

interface InterviewerItem {
  name: string;
  assigned: number;
  completed: number;
  pending: number;
  approved: number;
  avgDurationSeconds: number;
  formattedDuration: string;
  avgScore: number | null;
  approvalRate: number;
}

interface EvaluationCriterionItem {
  label: string;
  avgScore: number;
  maxScore: number;
  normalizedOutOf10: number;
  evaluatedCount: number;
}

interface AnalyticsData {
  eventId: string | null;
  overview: Overview;
  insights: Insights;
  timeTrend: TimeTrendPoint[];
  departmentDistribution: DepartmentItem[];
  statusDistribution: StatusItem[];
  interviewerPerformance: InterviewerItem[];
  evaluationCriteria: EvaluationCriterionItem[];
  filterOptions: {
    departments: string[];
    interviewers: string[];
  };
}

// ── Status Color Mapping ─────────────────────────────────────────────────────

const STATUS_COLOR_MAP: Record<string, string> = {
  Waiting: "#8A938D",
  Interviewing: "#00FF66",
  Approved: "#00E55C",
  Pending: "#FFB020",
  "Discussion Needed": "#FF4D4D",
};

// ── Custom Dark Tooltip ──────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0B0D0C]/95 border border-[#1D2A22] rounded-xl p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-1.5 z-50">
        <p className="font-bold text-[#F5F5F5] uppercase tracking-wider text-[11px] pb-1 border-b border-[#1D2A22]/50">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 font-mono text-[11px]">
            <span className="flex items-center gap-1.5 text-[#8A938D]">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: entry.color || entry.fill || "#00FF66" }}
              />
              {entry.name}:
            </span>
            <span className="font-bold text-[#F5F5F5]">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const { eventId, currentEvent, isEventWorkspace } = useEvent();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  // ── Filters State ──────────────────────────────────────────────────────────
  const [filterDateRange, setFilterDateRange] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterInterviewer, setFilterInterviewer] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [timelineGrouping, setTimelineGrouping] = useState<"daily" | "weekly" | "monthly">("daily");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ── Fetch Analytics ────────────────────────────────────────────────────────
  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (eventId) params.set("eventId", eventId);
      if (filterDepartment !== "all") params.set("department", filterDepartment);
      if (filterInterviewer !== "all") params.set("interviewer", filterInterviewer);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterDateRange !== "all") params.set("dateRange", filterDateRange);
      if (filterDateRange === "custom") {
        if (customStartDate) params.set("startDate", customStartDate);
        if (customEndDate) params.set("endDate", customEndDate);
      }
      params.set("granularity", timelineGrouping);

      const res = await fetch(`/api/analytics?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setAnalyticsData(json.data);
      } else {
        setError(json.error || "Failed to load analytics");
      }
    } catch (e: any) {
      setError(e.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [
    eventId,
    filterDepartment,
    filterInterviewer,
    filterStatus,
    filterDateRange,
    customStartDate,
    customEndDate,
    timelineGrouping,
  ]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // ── Reset Filters ──────────────────────────────────────────────────────────
  const handleResetFilters = () => {
    setFilterDateRange("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setFilterDepartment("all");
    setFilterInterviewer("all");
    setFilterStatus("all");
  };

  const isFilterActive =
    filterDateRange !== "all" ||
    filterDepartment !== "all" ||
    filterInterviewer !== "all" ||
    filterStatus !== "all";

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!analyticsData) return;

    const lines: string[] = [];

    lines.push("NEXUS Recruitment Engine — Analytics Report");
    lines.push(`Generated At,${new Date().toLocaleString()}`);
    lines.push(`Event Scope,${isEventWorkspace && currentEvent ? currentEvent.name : "All Events"}`);
    lines.push(`Date Range Filter,${filterDateRange}`);
    lines.push(`Department Filter,${filterDepartment}`);
    lines.push(`Interviewer Filter,${filterInterviewer}`);
    lines.push(`Status Filter,${filterStatus}`);
    lines.push("");

    // 1. Overview KPIs
    lines.push("RECRUITMENT OVERVIEW KPIS");
    lines.push("Metric,Count,Percentage");
    const { overview, insights } = analyticsData;
    lines.push(`Total Applicants,${overview.total},100%`);
    lines.push(`Waiting,${overview.waiting},${overview.total > 0 ? ((overview.waiting / overview.total) * 100).toFixed(1) : 0}%`);
    lines.push(`Interviewing,${overview.interviewing},${overview.total > 0 ? ((overview.interviewing / overview.total) * 100).toFixed(1) : 0}%`);
    lines.push(`Approved,${overview.approved},${overview.total > 0 ? ((overview.approved / overview.total) * 100).toFixed(1) : 0}%`);
    lines.push(`Pending,${overview.pending},${overview.total > 0 ? ((overview.pending / overview.total) * 100).toFixed(1) : 0}%`);
    lines.push(`Discussion Needed,${overview.discussionNeeded},${overview.total > 0 ? ((overview.discussionNeeded / overview.total) * 100).toFixed(1) : 0}%`);
    lines.push(`Completed Interviews,${insights.completed},${insights.completionRate}%`);
    lines.push(`Approval Rate (Approved/Completed),${insights.approvalRate}%,-`);
    lines.push(`Average Interview Duration,${insights.formattedAvgDuration},-`);
    lines.push("");

    // 2. Department Breakdown
    lines.push("DEPARTMENT DISTRIBUTION");
    lines.push("Department,Applicant Count,Percentage of Total,Approved Count,Approval Rate");
    analyticsData.departmentDistribution.forEach((d) =>
      lines.push(`"${d.name}",${d.count},${d.percentage}%,${d.approved},${d.approvalRate}%`)
    );
    lines.push("");

    // 3. Status Breakdown
    lines.push("INTERVIEW STATUS DISTRIBUTION");
    lines.push("Status,Count,Percentage");
    analyticsData.statusDistribution.forEach((s) =>
      lines.push(`"${s.status}",${s.count},${s.percentage}%`)
    );
    lines.push("");

    // 4. Interviewer Performance
    lines.push("INTERVIEWER PERFORMANCE & WORKLOAD");
    lines.push("Interviewer Name,Assigned Applicants,Completed Interviews,Pending Decisions,Average Duration,Average Evaluation Score (out of 10),Approval Rate");
    analyticsData.interviewerPerformance.forEach((i) =>
      lines.push(
        `"${i.name}",${i.assigned},${i.completed},${i.pending},"${i.formattedDuration}",${i.avgScore !== null ? i.avgScore : "N/A"},${i.approvalRate}%`
      )
    );
    lines.push("");

    // 5. Evaluation Criteria Performance
    if (analyticsData.evaluationCriteria && analyticsData.evaluationCriteria.length > 0) {
      lines.push("EVALUATION CRITERIA ANALYTICS");
      lines.push("Criterion Label,Average Score,Max Score,Normalized Score (out of 10),Evaluations Count");
      analyticsData.evaluationCriteria.forEach((c) =>
        lines.push(`"${c.label}",${c.avgScore},${c.maxScore},${c.normalizedOutOf10},${c.evaluatedCount}`)
      );
      lines.push("");
    }

    // 6. Time series trend
    lines.push("APPLICATIONS TIMELINE TREND");
    lines.push("Date Period,New Applicants,Cumulative Total");
    analyticsData.timeTrend.forEach((t) =>
      lines.push(`"${t.date}",${t.count},${t.cumulative}`)
    );

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexus_recruitment_analytics_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Loading Skeleton ───────────────────────────────────────────────────────
  const SkeletonCard = () => (
    <div className="bg-[#101412] p-5 rounded-xl border border-[#1D2A22] flex flex-col gap-2 animate-pulse">
      <div className="h-3 bg-[#0B0D0C] rounded w-1/2 mb-1" />
      <div className="h-7 bg-[#0B0D0C] rounded w-3/4" />
      <div className="h-2 bg-[#0B0D0C] rounded w-full mt-1" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#050505] text-[#F5F5F5] font-body-md selection:bg-[#00FF66]/30 selection:text-[#00FF66]">
      <CustomCursor />

      {/* SideNavBar ────────────────────────────────────────────────────────── */}
      <AdminSidebar />

      {/* Main Content Area ─────────────────────────────────────────────────── */}
      <main className="md:ml-64 flex-1 flex flex-col min-h-screen relative">
        <div className="flex-1 p-6 md:p-8 space-y-6 overflow-x-hidden max-w-[1500px] mx-auto w-full">
          <EventWorkspaceBanner />

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#00FF66] text-2xl font-bold">query_stats</span>
                <h2 className="text-2xl font-black tracking-wide text-[#F5F5F5] uppercase">
                  Recruitment Analytics
                </h2>
              </div>
              <p className="text-xs text-[#8A938D] mt-1 font-semibold uppercase tracking-wider">
                {isEventWorkspace && currentEvent
                  ? `Real-time intelligence and funnel analytics for ${currentEvent.name}.`
                  : "Consolidated recruitment metrics across all configured recruitment events."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                disabled={!analyticsData || loading}
                className="px-4 py-2.5 bg-[#0B0D0C] hover:bg-[#00FF66] hover:text-[#050505] text-[#F5F5F5] border border-[#1D2A22] rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-md font-black"
                title="Export filtered recruitment report as CSV"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export Analytics CSV
              </button>
            </div>
          </div>

          {/* ── Filters Toolbar ──────────────────────────────────────────────── */}
          <div className="bg-[#101412] p-4 rounded-xl border border-[#1D2A22] flex flex-wrap items-center gap-3 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8A938D] pr-2 border-r border-[#1D2A22] hidden sm:flex">
              <span className="material-symbols-outlined text-[#00FF66] text-base">filter_alt</span>
              Filters:
            </div>

            {/* Date Range Preset */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-date" className="text-[10px] uppercase font-bold text-[#8A938D]">Period:</label>
              <select
                id="filter-date"
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value)}
                className="bg-[#0B0D0C] border border-[#1D2A22] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F5F5] font-semibold outline-none focus:border-[#00FF66] cursor-pointer"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {/* Custom Dates (Conditional) */}
            {filterDateRange === "custom" && (
              <div className="flex items-center gap-2 animate-fadeIn">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-[#0B0D0C] border border-[#1D2A22] rounded-lg px-2 py-1 text-xs text-[#F5F5F5] outline-none focus:border-[#00FF66]"
                />
                <span className="text-[#8A938D] text-xs">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-[#0B0D0C] border border-[#1D2A22] rounded-lg px-2 py-1 text-xs text-[#F5F5F5] outline-none focus:border-[#00FF66]"
                />
              </div>
            )}

            {/* Department Filter */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-dept" className="text-[10px] uppercase font-bold text-[#8A938D]">Dept:</label>
              <select
                id="filter-dept"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="bg-[#0B0D0C] border border-[#1D2A22] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F5F5] font-semibold outline-none focus:border-[#00FF66] cursor-pointer max-w-[150px] truncate"
              >
                <option value="all">All Departments</option>
                {analyticsData?.filterOptions?.departments?.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Interviewer Filter */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-interviewer" className="text-[10px] uppercase font-bold text-[#8A938D]">Interviewer:</label>
              <select
                id="filter-interviewer"
                value={filterInterviewer}
                onChange={(e) => setFilterInterviewer(e.target.value)}
                className="bg-[#0B0D0C] border border-[#1D2A22] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F5F5] font-semibold outline-none focus:border-[#00FF66] cursor-pointer max-w-[150px] truncate"
              >
                <option value="all">All Interviewers</option>
                {analyticsData?.filterOptions?.interviewers?.map((inv) => (
                  <option key={inv} value={inv}>
                    {inv}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-status" className="text-[10px] uppercase font-bold text-[#8A938D]">Status:</label>
              <select
                id="filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#0B0D0C] border border-[#1D2A22] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F5F5] font-semibold outline-none focus:border-[#00FF66] cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="Waiting">Waiting</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Discussion Needed">Discussion Needed</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {isFilterActive && (
              <button
                onClick={handleResetFilters}
                className="ml-auto text-[10px] text-[#FF4D4D] hover:text-[#FF7878] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
                Clear Filters
              </button>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-[#FF4D4D]/10 border border-[#FF4D4D]/20 text-[#FF4D4D] p-4 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              <p className="text-xs font-semibold uppercase tracking-wider">{error}</p>
            </div>
          )}

          {/* ── 1. Recruitment KPI Cards (Compact Overview) ─────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            ) : analyticsData ? (
              <>
                {/* Total Applicants (Clean card: decorative line removed) */}
                <div className="bg-[#101412] p-4 rounded-xl border border-[#1D2A22] flex flex-col justify-between hover:border-[#00FF66]/30 transition-all shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-[#00FF66] uppercase tracking-widest">
                      Total Applicants
                    </span>
                    <span className="material-symbols-outlined text-[#00FF66] text-base">groups</span>
                  </div>
                  <span className="text-3xl font-black text-[#F5F5F5] tracking-tight mt-1">
                    {analyticsData.overview.total}
                  </span>
                  <p className="text-[9px] text-[#8A938D] font-bold uppercase tracking-wider mt-1">
                    Registered candidates
                  </p>
                </div>

                {/* Waiting */}
                <div className="bg-[#101412] p-4 rounded-xl border border-[#1D2A22] flex flex-col justify-between hover:border-[#8A938D]/40 transition-all shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest">
                      Waiting
                    </span>
                    <span className="material-symbols-outlined text-[#8A938D] text-base">hourglass_empty</span>
                  </div>
                  <span className="text-3xl font-black text-[#8A938D] tracking-tight mt-1">
                    {analyticsData.overview.waiting}
                  </span>
                  <p className="text-[9px] text-[#8A938D]/70 font-bold uppercase tracking-wider mt-1">
                    In queue for room
                  </p>
                </div>

                {/* Interviewing */}
                <div className="bg-[#101412] p-4 rounded-xl border border-[#00FF66]/20 bg-[#00FF66]/5 flex flex-col justify-between hover:border-[#00FF66]/50 transition-all shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-[#00FF66] uppercase tracking-widest">
                      Interviewing
                    </span>
                    <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse" />
                  </div>
                  <span className="text-3xl font-black text-[#00FF66] tracking-tight mt-1">
                    {analyticsData.overview.interviewing}
                  </span>
                  <p className="text-[9px] text-[#00FF66]/80 font-bold uppercase tracking-wider mt-1">
                    Active sessions now
                  </p>
                </div>

                {/* Approved */}
                <div className="bg-[#101412] p-4 rounded-xl border border-[#1D2A22] flex flex-col justify-between hover:border-[#00E55C]/40 transition-all shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-[#00E55C] uppercase tracking-widest">
                      Approved
                    </span>
                    <span className="material-symbols-outlined text-[#00E55C] text-base">verified</span>
                  </div>
                  <span className="text-3xl font-black text-[#00E55C] tracking-tight mt-1">
                    {analyticsData.overview.approved}
                  </span>
                  <p className="text-[9px] text-[#8A938D] font-bold uppercase tracking-wider mt-1">
                    Ready for offer
                  </p>
                </div>

                {/* Pending */}
                <div className="bg-[#101412] p-4 rounded-xl border border-[#1D2A22] flex flex-col justify-between hover:border-[#FFB020]/40 transition-all shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-[#FFB020] uppercase tracking-widest">
                      Pending
                    </span>
                    <span className="material-symbols-outlined text-[#FFB020] text-base">pending_actions</span>
                  </div>
                  <span className="text-3xl font-black text-[#FFB020] tracking-tight mt-1">
                    {analyticsData.overview.pending}
                  </span>
                  <p className="text-[9px] text-[#8A938D] font-bold uppercase tracking-wider mt-1">
                    Awaiting final review
                  </p>
                </div>

                {/* Discussion Needed */}
                <div className="bg-[#101412] p-4 rounded-xl border border-[#1D2A22] flex flex-col justify-between hover:border-[#FF4D4D]/40 transition-all shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-[#FF4D4D] uppercase tracking-widest">
                      Attention
                    </span>
                    <span className="material-symbols-outlined text-[#FF4D4D] text-base">warning</span>
                  </div>
                  <span className="text-3xl font-black text-[#FF4D4D] tracking-tight mt-1">
                    {analyticsData.overview.discussionNeeded}
                  </span>
                  <p className="text-[9px] text-[#8A938D] font-bold uppercase tracking-wider mt-1">
                    Discussion needed
                  </p>
                </div>
              </>
            ) : null}
          </div>

          {/* ── 2. Recruitment Funnel & Key Performance Rates ─────────────────── */}
          {analyticsData && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Funnel Progress */}
              <div className="lg:col-span-3 bg-[#101412] p-5 rounded-xl border border-[#1D2A22] shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#1D2A22] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00FF66] text-base">filter_list</span>
                    <h3 className="text-xs font-black text-[#F5F5F5] uppercase tracking-widest">
                      Recruitment Pipeline Funnel
                    </h3>
                  </div>
                  <span className="text-[10px] text-[#8A938D] font-mono font-bold uppercase">
                    Stage Progression
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                  {analyticsData.insights.funnel.map((step, idx) => (
                    <div
                      key={step.stage}
                      className="bg-[#0B0D0C] p-3 rounded-lg border border-[#1D2A22] flex flex-col justify-between"
                    >
                      <span className="text-[9px] font-black text-[#8A938D] uppercase tracking-wider truncate">
                        #{idx + 1} {step.stage}
                      </span>
                      <div className="my-1.5 flex items-baseline justify-between">
                        <span className="text-xl font-mono font-bold text-[#F5F5F5]">{step.count}</span>
                        <span className="text-[10px] font-mono text-[#00FF66] font-bold">
                          {step.percentage}%
                        </span>
                      </div>
                      <div className="w-full h-1 bg-[#101412] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#00FF66]"
                          style={{ width: `${Math.min(100, Math.max(0, step.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conversion Metrics */}
              <div className="bg-[#101412] p-5 rounded-xl border border-[#1D2A22] shadow-xl flex flex-col justify-between gap-3">
                <div className="flex items-center gap-2 border-b border-[#1D2A22] pb-2.5">
                  <span className="material-symbols-outlined text-[#00FF66] text-base">speed</span>
                  <h3 className="text-xs font-black text-[#F5F5F5] uppercase tracking-widest">
                    Conversion Rates
                  </h3>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8A938D] font-bold uppercase tracking-wider text-[10px]">
                      Approval Rate
                    </span>
                    <span className="font-mono font-bold text-[#00FF66] text-sm">
                      {analyticsData.insights.approvalRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8A938D] font-bold uppercase tracking-wider text-[10px]">
                      Completion Rate
                    </span>
                    <span className="font-mono font-bold text-[#F5F5F5] text-sm">
                      {analyticsData.insights.completionRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8A938D] font-bold uppercase tracking-wider text-[10px]">
                      Avg Interview Duration
                    </span>
                    <span className="font-mono font-bold text-[#FFB020] text-sm">
                      {analyticsData.insights.formattedAvgDuration}
                    </span>
                  </div>
                </div>

                <p className="text-[9px] text-[#8A938D]/60 pt-2 border-t border-[#1D2A22] font-semibold">
                  * Calculated from actual completed interview sessions.
                </p>
              </div>
            </div>
          )}

          {/* ── 3. Line Chart — Applications Over Time ───────────────────────── */}
          <div className="bg-[#101412] p-6 rounded-xl border border-[#1D2A22] shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1D2A22] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00FF66] text-lg font-bold">show_chart</span>
                <div>
                  <h3 className="text-sm font-black text-[#F5F5F5] uppercase tracking-widest">
                    Applications Trend Over Time
                  </h3>
                  <p className="text-[10px] text-[#8A938D] font-semibold uppercase tracking-wider mt-0.5">
                    Real applicant registration timeline based on database timestamps
                  </p>
                </div>
              </div>

              {/* Granularity Switcher */}
              <div className="flex items-center gap-1 bg-[#0B0D0C] p-1 rounded-lg border border-[#1D2A22] self-start sm:self-auto">
                {(["daily", "weekly", "monthly"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setTimelineGrouping(g)}
                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      timelineGrouping === g
                        ? "bg-[#00FF66] text-[#050505] shadow-sm font-black"
                        : "text-[#8A938D] hover:text-[#F5F5F5]"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="h-72 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#00FF66]/20 border-t-[#00FF66] rounded-full animate-spin" />
              </div>
            ) : analyticsData && analyticsData.timeTrend.length > 0 ? (
              <div className="space-y-3">
                <div className="h-72 w-full">
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={analyticsData.timeTrend}
                        margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00FF66" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#00FF66" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1D2A22" vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="#8A938D"
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: "#1D2A22" }}
                        />
                        <YAxis
                          stroke="#8A938D"
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: "#1D2A22" }}
                          allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="count"
                          name="New Applicants"
                          stroke="#00FF66"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorCount)"
                          dot={{ r: analyticsData.timeTrend.length === 1 ? 6 : 4, fill: "#00FF66", stroke: "#050505", strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: "#00FF66", stroke: "#F5F5F5", strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {analyticsData.timeTrend.length === 1 && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0B0D0C] border border-[#1D2A22] text-[11px] text-[#8A938D]">
                    <span className="material-symbols-outlined text-[#00FF66] text-sm">info</span>
                    <span>
                      All registrations for this period occurred within <strong>{analyticsData.timeTrend[0].date}</strong> ({analyticsData.timeTrend[0].count} applicants). Switch to <strong>Daily</strong> view to see date-level distribution.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-[#8A938D] border border-dashed border-[#1D2A22] rounded-xl p-8">
                <span className="material-symbols-outlined text-4xl mb-2 text-[#8A938D]/40">calendar_today</span>
                <p className="text-xs font-bold uppercase tracking-wider">No registration data found for this period</p>
                <p className="text-[10px] text-[#8A938D]/60 mt-1">Try adjusting the active date filter or scope</p>
              </div>
            )}
          </div>

          {/* ── 4 & 5. Middle Row: Department Distribution & Status Distribution ─ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Breakdown Bar Chart */}
            <div className="bg-[#101412] p-6 rounded-xl border border-[#1D2A22] shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#1D2A22] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00FF66] text-lg font-bold">domain</span>
                  <h3 className="text-sm font-black text-[#F5F5F5] uppercase tracking-widest">
                    Department Distribution
                  </h3>
                </div>
                <span className="text-[10px] text-[#8A938D] font-mono font-bold uppercase">
                  {analyticsData?.departmentDistribution?.length || 0} Departments
                </span>
              </div>

              {loading ? (
                <div className="h-72 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#00FF66]/20 border-t-[#00FF66] rounded-full animate-spin" />
                </div>
              ) : analyticsData && analyticsData.departmentDistribution.length > 0 ? (
                <div className="h-72 w-full">
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analyticsData.departmentDistribution}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 35, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1D2A22" horizontal={false} />
                        <XAxis
                          type="number"
                          stroke="#8A938D"
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: "#1D2A22" }}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          stroke="#8A938D"
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: "#1D2A22" }}
                          width={60}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="count"
                          name="Applicants"
                          fill="#00FF66"
                          radius={[0, 4, 4, 0]}
                          barSize={16}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              ) : (
                <p className="text-[#8A938D] text-xs font-semibold uppercase tracking-wider py-8 text-center">
                  No department data available.
                </p>
              )}
            </div>

            {/* Status Distribution Bar Chart */}
            <div className="bg-[#101412] p-6 rounded-xl border border-[#1D2A22] shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#1D2A22] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00FF66] text-lg font-bold">pie_chart</span>
                  <h3 className="text-sm font-black text-[#F5F5F5] uppercase tracking-widest">
                    Interview Status Distribution
                  </h3>
                </div>
                <span className="text-[10px] text-[#8A938D] font-mono font-bold uppercase">
                  Current Pipeline
                </span>
              </div>

              {loading ? (
                <div className="h-72 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#00FF66]/20 border-t-[#00FF66] rounded-full animate-spin" />
                </div>
              ) : analyticsData && analyticsData.statusDistribution.length > 0 ? (
                <div className="h-72 w-full">
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analyticsData.statusDistribution}
                        margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1D2A22" vertical={false} />
                        <XAxis
                          dataKey="status"
                          stroke="#8A938D"
                          fontSize={9}
                          tickLine={false}
                          axisLine={{ stroke: "#1D2A22" }}
                          angle={-15}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis
                          stroke="#8A938D"
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: "#1D2A22" }}
                          allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Candidates" radius={[4, 4, 0, 0]} barSize={26}>
                          {analyticsData.statusDistribution.map((entry) => (
                            <Cell
                              key={entry.status}
                              fill={STATUS_COLOR_MAP[entry.status] || "#00FF66"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              ) : (
                <p className="text-[#8A938D] text-xs font-semibold uppercase tracking-wider py-8 text-center">
                  No status data available.
                </p>
              )}
            </div>
          </div>

          {/* ── 6. Interviewer Workload & Performance ────────────────────────── */}
          <div className="bg-[#101412] p-6 rounded-xl border border-[#1D2A22] shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1D2A22] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00FF66] text-lg font-bold">badge</span>
                <div>
                  <h3 className="text-sm font-black text-[#F5F5F5] uppercase tracking-widest">
                    Interviewer Workload &amp; Performance
                  </h3>
                  <p className="text-[10px] text-[#8A938D] font-semibold uppercase tracking-wider mt-0.5">
                    Attributed interview sessions, turnaround velocity, and scoring distribution
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-[#8A938D] font-mono font-bold uppercase">
                {analyticsData?.interviewerPerformance?.length || 0} Interviewers Active
              </span>
            </div>

            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#00FF66]/20 border-t-[#00FF66] rounded-full animate-spin" />
              </div>
            ) : analyticsData && analyticsData.interviewerPerformance.length > 0 ? (
              <div className="space-y-6">
                {/* Workload Bar Chart */}
                <div className="h-64 w-full">
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analyticsData.interviewerPerformance}
                        margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1D2A22" vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke="#8A938D"
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: "#1D2A22" }}
                        />
                        <YAxis
                          stroke="#8A938D"
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: "#1D2A22" }}
                          allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                          formatter={(value) => <span className="text-[#8A938D] font-bold uppercase text-[10px]">{value}</span>}
                        />
                        <Bar dataKey="assigned" name="Assigned" fill="#8A938D" radius={[3, 3, 0, 0]} barSize={18} />
                        <Bar dataKey="completed" name="Completed" fill="#00FF66" radius={[3, 3, 0, 0]} barSize={18} />
                        <Bar dataKey="pending" name="Pending" fill="#FFB020" radius={[3, 3, 0, 0]} barSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Table Breakdown */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#0B0D0C] border-b border-[#1D2A22] text-[#8A938D] uppercase font-black tracking-wider text-[9px]">
                        <th className="py-3 px-4">Interviewer</th>
                        <th className="py-3 px-4 text-center">Assigned</th>
                        <th className="py-3 px-4 text-center">Completed</th>
                        <th className="py-3 px-4 text-center">Pending Review</th>
                        <th className="py-3 px-4 text-center">Avg Duration</th>
                        <th className="py-3 px-4 text-center">Avg Rating (1-10)</th>
                        <th className="py-3 px-4 text-right">Approval Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1D2A22]/40 font-mono">
                      {analyticsData.interviewerPerformance.map((row) => (
                        <tr key={row.name} className="hover:bg-[#00FF66]/5 transition-colors">
                          <td className="py-3 px-4 font-body-md font-bold text-[#F5F5F5]">{row.name}</td>
                          <td className="py-3 px-4 text-center text-[#8A938D]">{row.assigned}</td>
                          <td className="py-3 px-4 text-center text-[#00FF66] font-bold">{row.completed}</td>
                          <td className="py-3 px-4 text-center text-[#FFB020] font-bold">{row.pending}</td>
                          <td className="py-3 px-4 text-center text-[#8A938D]">{row.formattedDuration}</td>
                          <td className="py-3 px-4 text-center">
                            {row.avgScore !== null ? (
                              <span className="font-bold text-[#00FF66]">{row.avgScore} / 10</span>
                            ) : (
                              <span className="text-[#8A938D]/60">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-[#00FF66]">
                            {row.completed > 0 ? `${row.approvalRate}%` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-[#8A938D] text-xs font-semibold uppercase tracking-wider py-8 text-center">
                No interviewer workload records available.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
