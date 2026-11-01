"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/ui/LogoutButton";
import CustomCursor from "@/components/ui/CustomCursor";
import AdminSidebar from "@/components/admin/AdminSidebar";
import EventWorkspaceBanner from "@/components/admin/EventWorkspaceBanner";
import { useEvent } from "@/context/EventContext";

// ── Types ────────────────────────────────────────────────────────────────────

interface ApplicantResult {
  _id: string;
  name: string;
  rollNumber: string;
  email?: string;
  phone?: string;
  department?: string;
  branch?: string;
  year?: string;
  teamApplied?: string;
  source?: string;
  eventId?: string;
  responses: Record<string, string>;
  interviewStatus: string;
  assignedRoom?: number | null;
  assignedInterviewer?: string;
  interviewDuration?: number;
  finalDecision?: string;
  interviewNotes?: string;
  updatedAt: string;
  createdAt: string;
  evaluation?: {
    technical?: number;
    communication?: number;
    confidence?: number;
    leadership?: number;
    teamwork?: number;
    criteriaSnapshot?: Array<{
      id: string;
      label: string;
      score: number;
      maxScore: number;
    }>;
    submittedAt?: string;
  };
  interview?: {
    ratings?: {
      technical: number;
      communication: number;
      confidence: number;
      leadership: number;
      teamwork: number;
    };
    notes?: string;
    decision?: string;
    startTime?: string;
    endTime?: string;
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminResultsPage() {
  const pathname = usePathname();
  const { eventId } = useEvent();
  const [data, setData] = useState<ApplicantResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [interviewerFilter, setInterviewerFilter] = useState("All");

  // Expanded row state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Data Fetching ───────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = eventId
        ? `/api/results?eventId=${encodeURIComponent(eventId)}`
        : "/api/results";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to fetch results");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch results");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived State (Options for filters) ─────────────────────────────────────
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(data.map(a => a.interviewStatus || "Waiting"));
    return ["All", ...Array.from(statuses)];
  }, [data]);

  const uniqueDepartments = useMemo(() => {
    const depts = new Set(data.map(a => a.department).filter(Boolean));
    return ["All", ...Array.from(depts)];
  }, [data]);

  const uniqueInterviewers = useMemo(() => {
    const interviewers = new Set(data.map(a => a.assignedInterviewer).filter(Boolean));
    return ["All", ...Array.from(interviewers)];
  }, [data]);

  // ── Filtering Logic ─────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    return data.filter(a => {
      // Search
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        a.name.toLowerCase().includes(searchLower) || 
        a.rollNumber.toLowerCase().includes(searchLower);
      
      // Filters
      const matchesStatus = statusFilter === "All" || (a.interviewStatus || "Waiting") === statusFilter;
      const matchesDept = departmentFilter === "All" || a.department === departmentFilter;
      const matchesInterviewer = interviewerFilter === "All" || a.assignedInterviewer === interviewerFilter;

      return matchesSearch && matchesStatus && matchesDept && matchesInterviewer;
    });
  }, [data, searchQuery, statusFilter, departmentFilter, interviewerFilter]);

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (filteredData.length === 0) return;

    const headers = [
      "Name", "Roll Number", "Department", "Applied Team", "Room", "Interviewer",
      "Status", "Duration (s)", "Final Decision", "Updated At"
    ];

    const rows = filteredData.map(a => [
      `"${a.name || ''}"`,
      `"${a.rollNumber || ''}"`,
      `"${a.department || ''}"`,
      `"${a.teamApplied || ''}"`,
      a.assignedRoom ? `"${a.assignedRoom}"` : '""',
      `"${a.assignedInterviewer || ''}"`,
      `"${a.interviewStatus || ''}"`,
      `"${a.interviewDuration || 0}"`,
      `"${a.finalDecision || ''}"`,
      `"${new Date(a.updatedAt).toLocaleString()}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `nexus_results_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Render Helpers ──────────────────────────────────────────────────────────
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved": return "text-[#00FF66] bg-[#00FF66]/10";
      case "Interviewing": return "text-[#00FF66] bg-[#00FF66]/10 animate-pulse";
      case "Discussion Needed": return "text-[#FF4D4D] bg-[#FF4D4D]/10";
      case "Pending": return "text-[#FFB020] bg-[#FFB020]/10";
      default: return "text-[#8A938D] bg-[#8A938D]/10"; // Waiting
    }
  };

  const renderExpandedContent = (a: ApplicantResult) => {
    const status = (a.interviewStatus || "Waiting").toUpperCase();
    
    if (status === "WAITING") {
      return (
        <div className="text-center py-6 text-[#8A938D]">
          <span className="material-symbols-outlined text-3xl mb-2 text-[#8A938D]/40">hourglass_empty</span>
          <p className="text-xs font-bold uppercase tracking-wider">No interview has been conducted yet.</p>
        </div>
      );
    }

    if (status === "INTERVIEWING") {
      return (
        <div className="space-y-4">
          <h4 className="text-[10px] font-black tracking-widest text-[#00FF66] uppercase">Interview In Progress</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#050505]/40 border border-[#14321c] rounded-lg p-3">
              <p className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest mb-1">Interviewer</p>
              <p className="text-sm font-semibold text-[#F5F5F5]">{a.assignedInterviewer || "Not Assigned"}</p>
            </div>
            <div className="bg-[#050505]/40 border border-[#14321c] rounded-lg p-3">
              <p className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest mb-1">Room</p>
              <p className="text-sm font-semibold text-[#F5F5F5]">{a.assignedRoom ? `Room ${String(a.assignedRoom).padStart(2, "0")}` : "Not Assigned"}</p>
            </div>
            <div className="bg-[#050505]/40 border border-[#14321c] rounded-lg p-3">
              <p className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest mb-1">Duration</p>
              <p className="text-sm font-semibold text-[#F5F5F5]">
                {a.interviewDuration ? `${Math.floor(a.interviewDuration / 60)}m ${a.interviewDuration % 60}s` : "0m 0s"}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // APPROVED, PENDING, DISCUSSION NEEDED (or any other status)
    return (
      <div className="space-y-6">
        {/* Interview Details Grid */}
        <div>
          <h4 className="text-[10px] font-black tracking-widest text-[#00FF66] uppercase mb-3">Interview Details</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#050505]/40 border border-[#14321c] rounded-lg p-3">
              <p className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest mb-1">Interviewer</p>
              <p className="text-sm font-semibold text-[#F5F5F5]">{a.assignedInterviewer || "—"}</p>
            </div>
            <div className="bg-[#050505]/40 border border-[#14321c] rounded-lg p-3">
              <p className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest mb-1">Room</p>
              <p className="text-sm font-semibold text-[#F5F5F5]">{a.assignedRoom ? `Room ${String(a.assignedRoom).padStart(2, "0")}` : "—"}</p>
            </div>
            <div className="bg-[#050505]/40 border border-[#14321c] rounded-lg p-3">
              <p className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest mb-1">Interview Duration</p>
              <p className="text-sm font-semibold text-[#F5F5F5]">
                {a.interviewDuration ? `${Math.floor(a.interviewDuration / 60)}m ${a.interviewDuration % 60}s` : "—"}
              </p>
            </div>
            <div className="bg-[#050505]/40 border border-[#14321c] rounded-lg p-3">
              <p className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest mb-1">Decision</p>
              <p className="text-sm font-semibold text-[#F5F5F5]">{a.finalDecision || "—"}</p>
            </div>
          </div>
        </div>

        {/* Ratings & Notes Split Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ratings */}
          <div>
            <h4 className="text-[10px] font-black tracking-widest text-[#00FF66] uppercase mb-3">Ratings</h4>
            <div className="bg-[#050505]/40 border border-[#14321c] rounded-lg p-4 space-y-3">
              {(() => {
                const hasSnapshot = Array.isArray(a.evaluation?.criteriaSnapshot) && a.evaluation.criteriaSnapshot.length > 0;
                
                const isHistorical = !hasSnapshot && a.evaluation &&
                  a.evaluation.technical === 7 &&
                  a.evaluation.communication === 8 &&
                  a.evaluation.confidence === 8 &&
                  a.evaluation.leadership === 6 &&
                  a.evaluation.teamwork === 9 &&
                  new Date(a.updatedAt).getTime() < new Date("2026-08-22T15:00:00Z").getTime();

                const criteriaList = hasSnapshot
                  ? a.evaluation!.criteriaSnapshot!.map((cs) => ({
                      label: cs.label,
                      val: cs.score,
                      maxScore: cs.maxScore || 10,
                    }))
                  : [
                      { label: "Technical", val: isHistorical ? undefined : a.evaluation?.technical, maxScore: 10 },
                      { label: "Communication", val: isHistorical ? undefined : a.evaluation?.communication, maxScore: 10 },
                      { label: "Confidence", val: isHistorical ? undefined : a.evaluation?.confidence, maxScore: 10 },
                      { label: "Leadership", val: isHistorical ? undefined : a.evaluation?.leadership, maxScore: 10 },
                      { label: "Teamwork", val: isHistorical ? undefined : a.evaluation?.teamwork, maxScore: 10 }
                    ];

                return (
                  <>
                    {criteriaList.map(({ label, val, maxScore }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-xs text-[#F5F5F5] capitalize truncate max-w-[150px]">{label}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 bg-[#0B0D0C] border border-[#1D2A22] rounded-full overflow-hidden">
                            <div 
                              className="height-full bg-[#00FF66] rounded-full" 
                              style={{ 
                                height: "100%", 
                                width: val !== undefined && val !== null ? `${Math.min(100, Math.max(0, (val / maxScore) * 100))}%` : "0%",
                                boxShadow: "0 0 6px rgba(0, 255, 102, 0.4)" 
                              }} 
                            />
                          </div>
                          <span className="text-xs font-mono font-bold text-[#00FF66] min-w-[36px] text-right">
                            {val !== undefined && val !== null ? `${val}/${maxScore}` : "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                    {isHistorical && (
                      <div className="text-[10px] text-[#8A938D] font-bold uppercase tracking-wider pt-2 border-t border-[#1D2A22]/30 text-center">
                        Historical evaluation data unavailable.
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Interview Notes */}
          <div className="flex flex-col">
            <h4 className="text-[10px] font-black tracking-widest text-[#00FF66] uppercase mb-3">Interview Notes</h4>
            <div className="flex-1 bg-[#050505]/40 border border-[#14321c] rounded-lg p-4">
              <p className="text-xs text-[#F5F5F5] leading-relaxed whitespace-pre-wrap">
                {a.interviewNotes || a.interview?.notes || "No interview notes were added."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#050505] text-[#F5F5F5] font-body-md selection:bg-[#00FF66]/30 selection:text-[#00FF66]">
      <CustomCursor />

      {/* SideNavBar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <main className="md:ml-64 flex-1 min-h-screen flex flex-col relative">

        {/* Page Content */}
        <div className="flex-1 p-8 max-w-7xl mx-auto w-full flex flex-col gap-6 overflow-x-hidden pt-8">
          <EventWorkspaceBanner />

          {/* Header & Actions */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-wide text-[#F5F5F5] uppercase">Results Registry</h2>
              <p className="text-[#8A938D] text-xs font-semibold uppercase tracking-wider mt-1">Comprehensive list of all applicants and their interview results.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleExportCSV}
                disabled={loading || filteredData.length === 0}
                className="px-5 py-2.5 bg-[#0B0D0C] hover:bg-[#00FF66] hover:text-[#050505] text-[#F5F5F5] border border-[#1D2A22] rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export CSV
              </button>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-[#FF4D4D]/10 border border-[#FF4D4D]/20 text-[#FF4D4D] p-4 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              <p className="text-xs font-semibold uppercase tracking-wider">{error}</p>
            </div>
          )}

          {/* Filters & Search */}
          <div className="bg-[#101412] border border-[#1D2A22] p-6 rounded-xl flex flex-col md:flex-row gap-4 items-end shadow-xl">
            <div className="flex-1 w-full">
              <label className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest mb-2 block">Search</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8A938D] text-[20px]">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Name or Roll Number..."
                  className="w-full bg-[#0B0D0C] border border-[#1D2A22] rounded-lg pl-10 pr-4 py-2 text-xs focus:ring-1 focus:ring-[#00FF66] focus:border-[#00FF66] transition-all outline-none text-[#F5F5F5] placeholder:text-[#8A938D]/60"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <label className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest mb-2 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#0B0D0C] border border-[#1D2A22] rounded-lg px-4 py-2 text-xs focus:ring-1 focus:ring-[#00FF66] focus:border-[#00FF66] transition-all outline-none text-[#F5F5F5] appearance-none"
              >
                {uniqueStatuses.map(s => <option key={s} value={s} className="bg-[#0B0D0C]">{s}</option>)}
              </select>
            </div>
            <div className="w-full md:w-48">
              <label className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest mb-2 block">Department</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full bg-[#0B0D0C] border border-[#1D2A22] rounded-lg px-4 py-2 text-xs focus:ring-1 focus:ring-[#00FF66] focus:border-[#00FF66] transition-all outline-none text-[#F5F5F5] appearance-none"
              >
                {uniqueDepartments.map(d => <option key={d} value={d} className="bg-[#0B0D0C]">{d}</option>)}
              </select>
            </div>
            <div className="w-full md:w-48">
              <label className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest mb-2 block">Interviewer</label>
              <select
                value={interviewerFilter}
                onChange={(e) => setInterviewerFilter(e.target.value)}
                className="w-full bg-[#0B0D0C] border border-[#1D2A22] rounded-lg px-4 py-2 text-xs focus:ring-1 focus:ring-[#00FF66] focus:border-[#00FF66] transition-all outline-none text-[#F5F5F5] appearance-none"
              >
                {uniqueInterviewers.map(i => <option key={i} value={i} className="bg-[#0B0D0C]">{i}</option>)}
              </select>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-[#101412] rounded-xl border border-[#1D2A22] overflow-hidden flex-1 flex flex-col min-h-[400px] shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0B0D0C] border-b border-[#1D2A22]">
                    <th className="px-6 py-4 text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Applicant</th>
                    <th className="px-6 py-4 text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Event</th>
                    <th className="px-6 py-4 text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Department</th>
                    <th className="px-6 py-4 text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Room &amp; Interviewer</th>
                    <th className="px-6 py-4 text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Decision</th>
                    <th className="px-6 py-4 text-[9px] font-black text-[#8A938D] uppercase tracking-widest text-right">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1D2A22]/50">
                  {loading ? (
                    // Loading Skeleton
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 bg-[#0B0D0C] rounded w-3/4 mb-1"></div><div className="h-3 bg-[#0B0D0C] rounded w-1/2"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-[#0B0D0C] rounded w-20"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-[#0B0D0C] rounded w-full"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-[#0B0D0C] rounded w-2/3 mb-1"></div><div className="h-3 bg-[#0B0D0C] rounded w-1/2"></div></td>
                        <td className="px-6 py-4"><div className="h-6 bg-[#0B0D0C] rounded-full w-24"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-[#0B0D0C] rounded w-1/2"></div></td>
                        <td className="px-6 py-4 text-right"><div className="h-4 bg-[#0B0D0C] rounded w-full ml-auto"></div></td>
                      </tr>
                    ))
                  ) : filteredData.length === 0 ? (
                    // Empty State
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-[#8A938D]">
                        <span className="material-symbols-outlined text-4xl mb-2 text-[#8A938D]/40">search_off</span>
                        <p className="text-xs font-bold uppercase tracking-wider">No applicants found matching the criteria</p>
                      </td>
                    </tr>
                  ) : (
                    // Render Data
                    filteredData.map(a => {
                      const isExpanded = expandedId === a._id;
                      return (
                        <React.Fragment key={a._id}>
                          <tr 
                            className="hover:bg-[#00FF66]/5 transition-colors cursor-pointer group"
                            onClick={() => {
                              setExpandedId(isExpanded ? null : a._id);
                            }}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[18px] text-[#8A938D] group-hover:text-[#00FF66] transition-colors select-none">
                                  {isExpanded ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                                </span>
                                <div>
                                  <p className="text-sm font-bold text-[#F5F5F5] group-hover:text-[#00FF66] transition-colors">{a.name}</p>
                                  <p className="text-xs text-[#8A938D] font-mono mt-0.5">{a.rollNumber}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/20">
                                {a.source || "Default"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-[#F5F5F5]">{a.department || "—"}</p>
                              {a.teamApplied && <p className="text-xs text-[#8A938D] mt-0.5">{a.teamApplied}</p>}
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-[#F5F5F5]">{a.assignedRoom ? `Room ${String(a.assignedRoom).padStart(2, "0")}` : "—"}</p>
                              <p className="text-xs text-[#8A938D] mt-0.5">{a.assignedInterviewer || "—"}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(a.interviewStatus || "Waiting")}`}>
                                {a.interviewStatus || "Waiting"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-semibold text-[#F5F5F5]">{a.finalDecision || "—"}</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <p className="text-xs text-[#8A938D] font-mono">{new Date(a.updatedAt).toLocaleDateString()}</p>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="px-6 py-5 bg-[#0B150F]/70 border-y border-[#14321c]">
                                <div className="rounded-lg border border-[#14321c] p-6 bg-[#080F0A]/90 text-left">
                                  {renderExpandedContent(a)}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      {/* Global CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        .neon-border-focus:focus-within {
            border-color: #00FF66;
            box-shadow: 0 0 15px rgba(0, 255, 102, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1D2A22;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #00FF66/30;
        }
      `}} />
    </div>
  );
}

