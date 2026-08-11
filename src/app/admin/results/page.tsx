"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/ui/LogoutButton";
import CustomCursor from "@/components/ui/CustomCursor";

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
  responses: Record<string, string>;
  interviewStatus: string;
  assignedRoom?: number | null;
  assignedInterviewer?: string;
  interviewDuration?: number;
  finalDecision?: string;
  interviewNotes?: string;
  updatedAt: string;
  createdAt: string;
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

  // ── State ───────────────────────────────────────────────────────────────────
  const [data, setData] = useState<ApplicantResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [interviewerFilter, setInterviewerFilter] = useState("All");

  // Drawer
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantResult | null>(null);

  // Escape key closes drawer
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setSelectedApplicant(null);
  }, []);
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // ── Data Fetching ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/results");
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
    };
    fetchData();
  }, []);

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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#050505] text-[#F5F5F5] font-body-md selection:bg-[#00FF66]/30 selection:text-[#00FF66]">
      <CustomCursor />

      {/* SideNavBar */}
      <aside className="w-64 fixed left-0 top-0 z-40 bg-[#0B0D0C] border-r border-[#1D2A22] shadow-2xl flex flex-col h-full py-6 hidden md:flex">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00FF66] flex items-center justify-center text-[#050505] shadow-[0_0_12px_rgba(0,255,102,0.4)]">
              <span className="material-symbols-outlined text-[20px] font-bold">terminal</span>
            </div>
            <div>
              <h1 className="text-lg font-black text-[#F5F5F5] tracking-wider">NEXUS</h1>
              <p className="text-[9px] font-bold tracking-widest text-[#8A938D] uppercase">Recruitment Engine</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 space-y-1.5 px-4 overflow-y-auto">
          <Link href="/admin/dashboard" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${pathname === '/admin/dashboard' ? 'bg-[#00FF66]/10 text-[#00FF66] border-r-2 border-[#00FF66] shadow-[inset_0_0_12px_rgba(0,255,102,0.05)]' : 'text-[#8A938D] hover:text-[#F5F5F5] hover:bg-[#101412] hover:translate-x-1'}`}>
            <span className="material-symbols-outlined text-lg">dashboard</span>
            <span className="text-xs font-bold uppercase tracking-wider">Dashboard</span>
          </Link>
          <Link href="/admin/applicants" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${pathname === '/admin/applicants' ? 'bg-[#00FF66]/10 text-[#00FF66] border-r-2 border-[#00FF66] shadow-[inset_0_0_12px_rgba(0,255,102,0.05)]' : 'text-[#8A938D] hover:text-[#F5F5F5] hover:bg-[#101412] hover:translate-x-1'}`}>
            <span className="material-symbols-outlined text-lg">group</span>
            <span className="text-xs font-bold uppercase tracking-wider">Applicants</span>
          </Link>
          <Link href="/admin/rooms" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${pathname === '/admin/rooms' ? 'bg-[#00FF66]/10 text-[#00FF66] border-r-2 border-[#00FF66] shadow-[inset_0_0_12px_rgba(0,255,102,0.05)]' : 'text-[#8A938D] hover:text-[#F5F5F5] hover:bg-[#101412] hover:translate-x-1'}`}>
            <span className="material-symbols-outlined text-lg">terminal</span>
            <span className="text-xs font-bold uppercase tracking-wider">Rooms</span>
          </Link>
          <Link href="/admin/results" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${pathname === '/admin/results' ? 'bg-[#00FF66]/10 text-[#00FF66] border-r-2 border-[#00FF66] shadow-[inset_0_0_12px_rgba(0,255,102,0.05)]' : 'text-[#8A938D] hover:text-[#F5F5F5] hover:bg-[#101412] hover:translate-x-1'}`}>
            <span className="material-symbols-outlined text-lg">assignment_turned_in</span>
            <span className="text-xs font-bold uppercase tracking-wider">Results</span>
          </Link>
          <Link href="/admin/analytics" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${pathname === '/admin/analytics' ? 'bg-[#00FF66]/10 text-[#00FF66] border-r-2 border-[#00FF66] shadow-[inset_0_0_12px_rgba(0,255,102,0.05)]' : 'text-[#8A938D] hover:text-[#F5F5F5] hover:bg-[#101412] hover:translate-x-1'}`}>
            <span className="material-symbols-outlined text-lg">analytics</span>
            <span className="text-xs font-bold uppercase tracking-wider">Analytics</span>
          </Link>
          <Link href="/admin/settings" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${pathname === '/admin/settings' ? 'bg-[#00FF66]/10 text-[#00FF66] border-r-2 border-[#00FF66] shadow-[inset_0_0_12px_rgba(0,255,102,0.05)]' : 'text-[#8A938D] hover:text-[#F5F5F5] hover:bg-[#101412] hover:translate-x-1'}`}>
            <span className="material-symbols-outlined text-lg">settings</span>
            <span className="text-xs font-bold uppercase tracking-wider">Settings</span>
          </Link>
        </nav>

        <div className="px-4 mt-auto">
          <div className="space-y-1">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="md:ml-64 flex-1 min-h-screen flex flex-col relative">
        {/* TopNavBar */}
        <header className="w-full sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-[#1D2A22] shadow-sm">
          <div className="flex items-center justify-between px-8 h-16 w-full max-w-container-max mx-auto">
            <div className="flex items-center gap-xl">
              <span className="text-xl font-black text-[#00FF66] drop-shadow-[0_0_8px_rgba(0,255,102,0.4)] md:hidden">NEXUS</span>
              <div className="hidden lg:flex items-center gap-lg">
                <div className="relative group neon-border-focus">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8A938D] text-[20px]">search</span>
                  <input 
                    className="bg-[#0B0D0C] border border-[#1D2A22] rounded-full pl-10 pr-4 py-1.5 text-xs w-64 focus:ring-1 focus:ring-[#00FF66] focus:border-[#00FF66] transition-all outline-none text-[#F5F5F5] placeholder:text-[#8A938D]" 
                    placeholder="Global search..." 
                    type="text" 
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 text-[#8A938D] hover:text-[#00FF66] hover:bg-[#00FF66]/10 rounded-full transition-all">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <div className="h-6 w-[1px] bg-[#1D2A22] mx-1"></div>
              <div className="flex items-center gap-3 cursor-pointer group">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-[#F5F5F5]">System Admin</p>
                  <p className="text-[10px] text-[#8A938D]">Active</p>
                </div>
                <div className="w-9 h-9 rounded-full border border-[#1D2A22] group-hover:border-[#00FF66] transition-colors bg-[#0B0D0C] flex items-center justify-center text-[#00FF66]">
                  <span className="material-symbols-outlined text-[18px]">shield_person</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-8 max-w-7xl mx-auto w-full flex flex-col gap-6 overflow-x-hidden pt-8">

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
                      <td colSpan={6} className="px-6 py-16 text-center text-[#8A938D]">
                        <span className="material-symbols-outlined text-4xl mb-2 text-[#8A938D]/40">search_off</span>
                        <p className="text-xs font-bold uppercase tracking-wider">No applicants found matching the criteria</p>
                      </td>
                    </tr>
                  ) : (
                    // Render Data
                    filteredData.map(a => (
                      <tr 
                        key={a._id} 
                        className="hover:bg-[#00FF66]/5 transition-colors cursor-pointer group"
                        onClick={() => {
                          setSelectedApplicant(a);
                        }}
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-[#F5F5F5] group-hover:text-[#00FF66] transition-colors">{a.name}</p>
                          <p className="text-xs text-[#8A938D] font-mono mt-0.5">{a.rollNumber}</p>
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      {/* ── Side Drawer ─────────────────────────────────────────────────────── */}
      {selectedApplicant && (
        <>  
          {/* Overlay */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            onClick={() => setSelectedApplicant(null)}
            aria-label="Close drawer"
          />
          {/* Panel */}
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              zIndex: 101,
              width: "min(45vw, 560px)",
              height: "100vh",
              background: "#0B0D0C",
              borderLeft: "1px solid #1D2A22",
              boxShadow: "-8px 0 32px rgba(0,0,0,0.8)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* ── Drawer Header ── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #1D2A22", flexShrink: 0, background: "#0B0D0C" }}>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 900, color: "#F5F5F5", margin: 0, lineHeight: 1.3, textTransform: "uppercase", letterSpacing: "0.05em" }}>{selectedApplicant.name}</h3>
                <p style={{ fontSize: "0.8rem", fontFamily: "monospace", color: "#8A938D", margin: "4px 0 0 0" }}>{selectedApplicant.rollNumber}</p>
              </div>
              <button
                onClick={() => setSelectedApplicant(null)}
                style={{ padding: "6px", borderRadius: "50%", border: "none", background: "transparent", color: "#8A938D", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                title="Close"
                className="hover:text-[#00FF66] transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>close</span>
              </button>
            </div>

            {/* ── Drawer Body ── */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }} className="custom-scrollbar">
              
              {/* ── Status + Decision cards ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ background: "#101412", border: "1px solid #1D2A22", borderRadius: "12px", padding: "14px" }}>
                  <p style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A938D", fontWeight: 900, marginBottom: "8px" }}>Status</p>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(selectedApplicant.interviewStatus || "Waiting")}`}>
                    {selectedApplicant.interviewStatus || "Waiting"}
                  </span>
                </div>
                <div style={{ background: "#101412", border: "1px solid #1D2A22", borderTop: "2px solid #00FF66", borderRadius: "12px", padding: "14px" }}>
                  <p style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A938D", fontWeight: 900, marginBottom: "8px" }}>Final Decision</p>
                  <p style={{ fontSize: "1rem", fontWeight: 900, color: "#F5F5F5" }}>{selectedApplicant.finalDecision || "—"}</p>
                </div>
              </div>

              {/* ── Profile fields ── */}
              <div>
                <h4 style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: "#00FF66", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>person</span>
                  Profile Information
                </h4>
                <div style={{ background: "#101412", border: "1px solid #1D2A22", borderRadius: "12px", padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "14px", columnGap: "20px" }}>
                  {[
                    { label: "Department", value: selectedApplicant.department },
                    { label: "Branch", value: selectedApplicant.branch },
                    { label: "Year", value: selectedApplicant.year },
                    { label: "Applied Team", value: selectedApplicant.teamApplied },
                    { label: "Email", value: selectedApplicant.email },
                    { label: "Phone", value: selectedApplicant.phone },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A938D", fontWeight: 900, marginBottom: "3px" }}>{label}</p>
                      <p style={{ fontSize: "13px", color: value ? "#F5F5F5" : "#8A938D" }}>{value || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Interview Details ── */}
              <div>
                <h4 style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: "#00FF66", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>admin_panel_settings</span>
                  Telemetry &amp; Interview Details
                </h4>
                <div style={{ background: "#101412", border: "1px solid #1D2A22", borderRadius: "12px", padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "14px", columnGap: "20px" }}>
                  {[
                    { label: "Assigned Room", value: selectedApplicant.assignedRoom ? `Room ${String(selectedApplicant.assignedRoom).padStart(2, "0")}` : null },
                    { label: "Interviewer", value: selectedApplicant.assignedInterviewer },
                    { label: "Duration", value: selectedApplicant.interviewDuration ? `${Math.floor(selectedApplicant.interviewDuration / 60)}m ${selectedApplicant.interviewDuration % 60}s` : null },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A938D", fontWeight: 900, marginBottom: "3px" }}>{label}</p>
                      <p style={{ fontSize: "13px", color: value ? "#F5F5F5" : "#8A938D" }}>{value || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Ratings ── */}
              {selectedApplicant.interview?.ratings && Object.keys(selectedApplicant.interview.ratings).length > 0 && (
                <div>
                  <h4 style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: "#00FF66", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>star</span>
                    Evaluation Metrics
                  </h4>
                  <div style={{ background: "#101412", border: "1px solid #1D2A22", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {Object.entries(selectedApplicant.interview.ratings).map(([key, val]) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "13px", color: "#F5F5F5", textTransform: "capitalize", flex: 1 }}>{key}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "100px", height: "6px", background: "#0B0D0C", borderRadius: "999px", overflow: "hidden" }}>
                            <div style={{ height: "100%", background: "#00FF66", borderRadius: "999px", width: `${(val / 5) * 100}%`, boxShadow: "0 0 8px rgba(0, 255, 102, 0.4)" }} />
                          </div>
                          <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#00FF66", minWidth: "16px", textAlign: "right", fontWeight: "bold" }}>{val}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Interview Notes ── */}
              {(selectedApplicant.interviewNotes || selectedApplicant.interview?.notes) && (
                <div>
                  <h4 style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: "#00FF66", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>edit_note</span>
                    Interview Log Notes
                  </h4>
                  <div style={{ background: "#101412", border: "1px solid #1D2A22", borderRadius: "12px", padding: "16px" }}>
                    <p style={{ fontSize: "13px", color: "#F5F5F5", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {selectedApplicant.interviewNotes || selectedApplicant.interview?.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Google Form Responses ── */}
              {selectedApplicant.responses && Object.keys(selectedApplicant.responses).length > 0 && (
                <div>
                  <h4 style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: "#00FF66", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>feed</span>
                    Application Form Responses
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {Object.entries(selectedApplicant.responses).map(([question, answer], idx) => (
                      <div key={idx} style={{ borderLeft: "2px solid #00FF66", paddingLeft: "14px" }}>
                        <p style={{ fontSize: "11px", color: "#8A938D", marginBottom: "3px", fontWeight: 600 }}>{question}</p>
                        <p style={{ fontSize: "13px", color: "#F5F5F5", lineHeight: 1.6 }}>{answer || "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Timeline ── */}
              <div>
                <h4 style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: "#00FF66", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>schedule</span>
                  Activity Timeline
                </h4>
                <div style={{ borderLeft: "2px solid #1D2A22", paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "14px", paddingBottom: "8px" }}>
                  <div style={{ position: "relative" }}>
                    <div style={{ position: "absolute", left: "-24px", top: "4px", width: "8px", height: "8px", borderRadius: "50%", background: "#8A938D", boxShadow: "0 0 0 3px #0B0D0C" }} />
                    <p style={{ fontSize: "13px", color: "#F5F5F5" }}>Application Received</p>
                    <p style={{ fontSize: "11px", color: "#8A938D", fontFamily: "monospace" }}>{new Date(selectedApplicant.createdAt || selectedApplicant.updatedAt).toLocaleString()}</p>
                  </div>
                  {selectedApplicant.interviewStatus !== "Waiting" && (
                    <div style={{ position: "relative" }}>
                      <div style={{ position: "absolute", left: "-24px", top: "4px", width: "8px", height: "8px", borderRadius: "50%", background: "#00FF66", boxShadow: "0 0 0 3px #0B0D0C" }} />
                      <p style={{ fontSize: "13px", color: "#F5F5F5" }}>Interview Started</p>
                      <p style={{ fontSize: "11px", color: "#8A938D", fontFamily: "monospace" }}>{selectedApplicant.interview?.startTime ? new Date(selectedApplicant.interview.startTime).toLocaleString() : "—"}</p>
                    </div>
                  )}
                  {["Approved", "Pending", "Discussion Needed"].includes(selectedApplicant.interviewStatus) && (
                    <div style={{ position: "relative" }}>
                      <div style={{ position: "absolute", left: "-24px", top: "4px", width: "8px", height: "8px", borderRadius: "50%", background: "#00FF66", boxShadow: "0 0 0 3px #0B0D0C" }} />
                      <p style={{ fontSize: "13px", color: "#F5F5F5" }}>Interview Completed</p>
                      <p style={{ fontSize: "11px", color: "#8A938D", fontFamily: "monospace" }}>{selectedApplicant.interview?.endTime ? new Date(selectedApplicant.interview.endTime).toLocaleString() : "—"}</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </>
      )}

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

