"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/ui/LogoutButton";

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
      case "Approved": return "text-secondary bg-secondary/10";
      case "Interviewing": return "text-primary bg-primary/10";
      case "Discussion Needed": return "text-error bg-error/10";
      case "Pending": return "text-warning bg-warning/10";
      default: return "text-on-surface-variant bg-surface-variant/30"; // Waiting
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-[#e1e2ed] font-body-md selection:bg-primary/30 selection:text-primary">

      {/* SideNavBar */}
      <aside className="w-64 fixed left-0 top-0 z-40 bg-surface-container backdrop-blur-md border-r border-outline-variant/20 shadow-2xl flex-col h-full py-lg hidden md:flex">
        <div className="px-md mb-xl">
          <div className="flex items-center gap-sm">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[20px]">terminal</span>
            </div>
            <div>
              <h1 className="font-headline-sm text-headline-sm font-black text-primary">NEXUS</h1>
              <p className="text-[10px] font-label-sm tracking-widest text-on-surface-variant uppercase">Recruitment Engine</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-xs px-sm overflow-y-auto">
          <Link href="/admin/dashboard" className={`flex items-center gap-md px-md py-sm transition-all duration-300 ${pathname === '/admin/dashboard' ? 'bg-primary/10 text-primary border-r-2 border-primary shadow-[inset_0_0_12px_rgba(180,197,255,0.2)] hover:glow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/30 hover:translate-x-1 transition-transform'}`}>
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-label-md text-label-md">Dashboard</span>
          </Link>
          <Link href="/admin/applicants" className={`flex items-center gap-md px-md py-sm transition-all duration-300 ${pathname === '/admin/applicants' ? 'bg-primary/10 text-primary border-r-2 border-primary shadow-[inset_0_0_12px_rgba(180,197,255,0.2)] hover:glow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/30 hover:translate-x-1 transition-transform'}`}>
            <span className="material-symbols-outlined">group</span>
            <span className="font-label-md text-label-md">Applicants</span>
          </Link>
          <Link href="/admin/rooms" className={`flex items-center gap-md px-md py-sm transition-all duration-300 ${pathname === '/admin/rooms' ? 'bg-primary/10 text-primary border-r-2 border-primary shadow-[inset_0_0_12px_rgba(180,197,255,0.2)] hover:glow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/30 hover:translate-x-1 transition-transform'}`}>
            <span className="material-symbols-outlined">terminal</span>
            <span className="font-label-md text-label-md">Interview Rooms</span>
          </Link>
          <Link href="/admin/results" className={`flex items-center gap-md px-md py-sm transition-all duration-300 ${pathname === '/admin/results' ? 'bg-primary/10 text-primary border-r-2 border-primary shadow-[inset_0_0_12px_rgba(180,197,255,0.2)] hover:glow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/30 hover:translate-x-1 transition-transform'}`}>
            <span className="material-symbols-outlined">assignment_turned_in</span>
            <span className="font-label-md text-label-md">Results</span>
          </Link>
          <Link href="/admin/analytics" className={`flex items-center gap-md px-md py-sm transition-all duration-300 ${pathname === '/admin/analytics' ? 'bg-primary/10 text-primary border-r-2 border-primary shadow-[inset_0_0_12px_rgba(180,197,255,0.2)] hover:glow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/30 hover:translate-x-1 transition-transform'}`}>
            <span className="material-symbols-outlined">analytics</span>
            <span className="font-label-md text-label-md">Analytics</span>
          </Link>
          <Link href="/admin/settings" className={`flex items-center gap-md px-md py-sm transition-all duration-300 ${pathname === '/admin/settings' ? 'bg-primary/10 text-primary border-r-2 border-primary shadow-[inset_0_0_12px_rgba(180,197,255,0.2)] hover:glow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/30 hover:translate-x-1 transition-transform'}`}>
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label-md text-label-md">Settings</span>
          </Link>
        </nav>
        <div className="px-sm mt-auto">
          <div className="space-y-xs">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="md:ml-64 flex-1 min-h-screen flex flex-col relative">
        {/* TopNavBar */}
        <header className="w-full sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between px-gutter h-16 w-full max-w-container-max mx-auto">
            <div className="flex items-center gap-xl">
              <span className="font-headline-md text-headline-md font-bold tracking-tighter text-primary drop-shadow-[0_0_8px_rgba(180,197,255,0.5)] md:hidden">NEXUS</span>
              <div className="hidden lg:flex items-center gap-lg">
                <div className="relative group neon-border-focus">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
                  <input 
                    className="bg-surface-variant/30 border border-outline-variant/30 rounded-full pl-10 pr-4 py-1.5 text-body-sm w-64 focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none text-on-surface placeholder:text-outline-variant" 
                    placeholder="Global search..." 
                    type="text" 
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-md">
              <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-full transition-all active:scale-95">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <div className="h-8 w-[1px] bg-outline-variant/30 mx-1"></div>
              <div className="flex items-center gap-sm cursor-pointer group">
                <div className="text-right hidden sm:block">
                  <p className="font-label-md text-label-md text-on-surface">System Admin</p>
                  <p className="text-[10px] text-on-surface-variant">Active</p>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-primary/20 group-hover:border-primary transition-colors bg-primary/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">shield_person</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-lg max-w-7xl mx-auto w-full flex flex-col gap-lg overflow-x-hidden pt-8">

          {/* Header & Actions */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-2">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-primary glow-cyan">Results Module</h2>
              <p className="text-on-surface-variant font-body-md text-body-md mt-sm">Comprehensive list of all applicants and their interview results.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleExportCSV}
                disabled={loading || filteredData.length === 0}
                className="px-md py-sm bg-surface-variant/30 hover:bg-surface-variant/50 text-on-surface border border-outline-variant/30 rounded-xl font-label-md text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export CSV
              </button>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-error/10 border border-error/20 text-error p-4 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              <p>{error}</p>
            </div>
          )}

          {/* Filters & Search */}
          <div className="glass-card p-md rounded-xl flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-xs font-label-sm text-on-surface-variant uppercase tracking-wider mb-2 block">Search</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Name or Roll Number..."
                  className="w-full bg-surface-variant/30 border border-outline-variant/30 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none text-on-surface placeholder:text-outline-variant"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <label className="text-xs font-label-sm text-on-surface-variant uppercase tracking-wider mb-2 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-surface-variant/30 border border-outline-variant/30 rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none text-on-surface appearance-none"
              >
                {uniqueStatuses.map(s => <option key={s} value={s} className="bg-surface-container">{s}</option>)}
              </select>
            </div>
            <div className="w-full md:w-48">
              <label className="text-xs font-label-sm text-on-surface-variant uppercase tracking-wider mb-2 block">Department</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full bg-surface-variant/30 border border-outline-variant/30 rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none text-on-surface appearance-none"
              >
                {uniqueDepartments.map(d => <option key={d} value={d} className="bg-surface-container">{d}</option>)}
              </select>
            </div>
            <div className="w-full md:w-48">
              <label className="text-xs font-label-sm text-on-surface-variant uppercase tracking-wider mb-2 block">Interviewer</label>
              <select
                value={interviewerFilter}
                onChange={(e) => setInterviewerFilter(e.target.value)}
                className="w-full bg-surface-variant/30 border border-outline-variant/30 rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none text-on-surface appearance-none"
              >
                {uniqueInterviewers.map(i => <option key={i} value={i} className="bg-surface-container">{i}</option>)}
              </select>
            </div>
          </div>

          {/* Data Table */}
          <div className="glass-card rounded-xl border border-outline-variant/30 overflow-hidden flex-1 flex flex-col min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-variant/20 border-b border-outline-variant/30">
                    <th className="px-4 py-3 text-xs font-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Applicant</th>
                    <th className="px-4 py-3 text-xs font-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Department</th>
                    <th className="px-4 py-3 text-xs font-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Room &amp; Interviewer</th>
                    <th className="px-4 py-3 text-xs font-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Status</th>
                    <th className="px-4 py-3 text-xs font-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Decision</th>
                    <th className="px-4 py-3 text-xs font-label-sm text-on-surface-variant uppercase tracking-wider font-semibold text-right">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {loading ? (
                    // Loading Skeleton
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-4 py-4"><div className="h-4 bg-surface-variant/40 rounded w-3/4 mb-1"></div><div className="h-3 bg-surface-variant/20 rounded w-1/2"></div></td>
                        <td className="px-4 py-4"><div className="h-4 bg-surface-variant/30 rounded w-full"></div></td>
                        <td className="px-4 py-4"><div className="h-4 bg-surface-variant/30 rounded w-2/3 mb-1"></div><div className="h-3 bg-surface-variant/20 rounded w-1/2"></div></td>
                        <td className="px-4 py-4"><div className="h-6 bg-surface-variant/30 rounded-full w-24"></div></td>
                        <td className="px-4 py-4"><div className="h-4 bg-surface-variant/30 rounded w-1/2"></div></td>
                        <td className="px-4 py-4 text-right"><div className="h-4 bg-surface-variant/30 rounded w-full ml-auto"></div></td>
                      </tr>
                    ))
                  ) : filteredData.length === 0 ? (
                    // Empty State
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">search_off</span>
                        <p>No applicants found matching the criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    // Render Data
                    filteredData.map(a => (
                      <tr 
                        key={a._id} 
                        className="hover:bg-primary/5 transition-colors cursor-pointer group"
                        onClick={() => {
                          console.log("Setting selected applicant:", a);
                          setSelectedApplicant(a);
                        }}
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-on-surface group-hover:text-primary transition-colors">{a.name}</p>
                          <p className="text-xs text-on-surface-variant">{a.rollNumber}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-on-surface">{a.department || "—"}</p>
                          {a.teamApplied && <p className="text-xs text-on-surface-variant">{a.teamApplied}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-on-surface">{a.assignedRoom ? `Room ${a.assignedRoom}` : "—"}</p>
                          <p className="text-xs text-on-surface-variant">{a.assignedInterviewer || "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-label-sm uppercase tracking-wider ${getStatusColor(a.interviewStatus || "Waiting")}`}>
                            {a.interviewStatus || "Waiting"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-on-surface">{a.finalDecision || "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-xs text-on-surface-variant">{new Date(a.updatedAt).toLocaleDateString()}</p>
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
            style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
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
              width: "min(42vw, 560px)",
              height: "100vh",
              background: "#111827",
              borderLeft: "1px solid rgba(180,197,255,0.15)",
              boxShadow: "-8px 0 32px rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* ── Drawer Header ── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid rgba(180,197,255,0.1)", flexShrink: 0, background: "rgba(17,24,39,0.95)" }}>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#e1e2ed", margin: 0, lineHeight: 1.3 }}>{selectedApplicant.name}</h3>
                <p style={{ fontSize: "0.8rem", color: "#9aa0b4", margin: "2px 0 0 0" }}>{selectedApplicant.rollNumber}</p>
              </div>
              <button
                onClick={() => setSelectedApplicant(null)}
                style={{ padding: "6px", borderRadius: "50%", border: "none", background: "transparent", color: "#9aa0b4", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                title="Close"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>close</span>
              </button>
            </div>

            {/* ── Drawer Body ── */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "28px" }}>
              
              {/* ── Status + Decision cards ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ background: "rgba(17,24,39,0.8)", border: "1px solid rgba(180,197,255,0.1)", borderRadius: "12px", padding: "14px" }}>
                  <p style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#9aa0b4", marginBottom: "6px" }}>Status</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs uppercase tracking-wider ${getStatusColor(selectedApplicant.interviewStatus || "Waiting")}`}>
                    {selectedApplicant.interviewStatus || "Waiting"}
                  </span>
                </div>
                <div style={{ background: "rgba(17,24,39,0.8)", border: "1px solid rgba(180,197,255,0.15)", borderTop: "2px solid #b4c5ff", borderRadius: "12px", padding: "14px" }}>
                  <p style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#9aa0b4", marginBottom: "6px" }}>Final Decision</p>
                  <p style={{ fontSize: "1rem", fontWeight: 700, color: "#e1e2ed" }}>{selectedApplicant.finalDecision || "—"}</p>
                </div>
              </div>

              {/* ── Profile fields ── */}
              <div>
                <h4 style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#b4c5ff", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>person</span>
                  Profile
                </h4>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(180,197,255,0.08)", borderRadius: "12px", padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "14px", columnGap: "20px" }}>
                  {[
                    { label: "Department", value: selectedApplicant.department },
                    { label: "Branch", value: selectedApplicant.branch },
                    { label: "Year", value: selectedApplicant.year },
                    { label: "Applied Team", value: selectedApplicant.teamApplied },
                    { label: "Email", value: selectedApplicant.email },
                    { label: "Phone", value: selectedApplicant.phone },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#9aa0b4", marginBottom: "3px" }}>{label}</p>
                      <p style={{ fontSize: "13px", color: value ? "#e1e2ed" : "#4a5060" }}>{value || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Interview Details ── */}
              <div>
                <h4 style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#b4c5ff", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>admin_panel_settings</span>
                  Interview Details
                </h4>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(180,197,255,0.08)", borderRadius: "12px", padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "14px", columnGap: "20px" }}>
                  {[
                    { label: "Assigned Room", value: selectedApplicant.assignedRoom ? `Room ${selectedApplicant.assignedRoom}` : null },
                    { label: "Interviewer", value: selectedApplicant.assignedInterviewer },
                    { label: "Duration", value: selectedApplicant.interviewDuration ? `${Math.floor(selectedApplicant.interviewDuration / 60)}m ${selectedApplicant.interviewDuration % 60}s` : null },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#9aa0b4", marginBottom: "3px" }}>{label}</p>
                      <p style={{ fontSize: "13px", color: value ? "#e1e2ed" : "#4a5060" }}>{value || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Ratings ── */}
              {selectedApplicant.interview?.ratings && Object.keys(selectedApplicant.interview.ratings).length > 0 && (
                <div>
                  <h4 style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9aa0b4", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>star</span>
                    Ratings
                  </h4>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(180,197,255,0.08)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {Object.entries(selectedApplicant.interview.ratings).map(([key, val]) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "13px", color: "#e1e2ed", textTransform: "capitalize" }}>{key}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "100px", height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "999px", overflow: "hidden" }}>
                            <div style={{ height: "100%", background: "#4cd7f6", borderRadius: "999px", width: `${(val / 10) * 100}%` }} />
                          </div>
                          <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#9aa0b4", minWidth: "16px", textAlign: "right" }}>{val}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Interview Notes ── */}
              {(selectedApplicant.interviewNotes || selectedApplicant.interview?.notes) && (
                <div>
                  <h4 style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#b4c5ff", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>edit_note</span>
                    Interview Notes
                  </h4>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(180,197,255,0.08)", borderRadius: "12px", padding: "16px" }}>
                    <p style={{ fontSize: "13px", color: "#e1e2ed", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {selectedApplicant.interviewNotes || selectedApplicant.interview?.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Google Form Responses ── */}
              {selectedApplicant.responses && Object.keys(selectedApplicant.responses).length > 0 && (
                <div>
                  <h4 style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9aa0b4", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>feed</span>
                    Google Form Responses
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {Object.entries(selectedApplicant.responses).map(([question, answer], idx) => (
                      <div key={idx} style={{ borderLeft: "2px solid rgba(180,197,255,0.25)", paddingLeft: "14px" }}>
                        <p style={{ fontSize: "11px", color: "#9aa0b4", marginBottom: "3px" }}>{question}</p>
                        <p style={{ fontSize: "13px", color: "#e1e2ed", lineHeight: 1.6 }}>{answer || "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Timeline ── */}
              <div>
                <h4 style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9aa0b4", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>schedule</span>
                  Timeline
                </h4>
                <div style={{ borderLeft: "2px solid rgba(255,255,255,0.1)", paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "14px", paddingBottom: "8px" }}>
                  <div style={{ position: "relative" }}>
                    <div style={{ position: "absolute", left: "-25px", top: "4px", width: "10px", height: "10px", borderRadius: "50%", background: "#b4c5ff", boxShadow: "0 0 0 3px #111827" }} />
                    <p style={{ fontSize: "13px", color: "#e1e2ed" }}>Application Received</p>
                    <p style={{ fontSize: "11px", color: "#9aa0b4" }}>{new Date(selectedApplicant.createdAt || selectedApplicant.updatedAt).toLocaleString()}</p>
                  </div>
                  {selectedApplicant.interviewStatus !== "Waiting" && (
                    <div style={{ position: "relative" }}>
                      <div style={{ position: "absolute", left: "-25px", top: "4px", width: "10px", height: "10px", borderRadius: "50%", background: "#4cd7f6", boxShadow: "0 0 0 3px #111827" }} />
                      <p style={{ fontSize: "13px", color: "#e1e2ed" }}>Interview Started</p>
                      <p style={{ fontSize: "11px", color: "#9aa0b4" }}>{selectedApplicant.interview?.startTime ? new Date(selectedApplicant.interview.startTime).toLocaleString() : "—"}</p>
                    </div>
                  )}
                  {["Approved", "Pending", "Discussion Needed"].includes(selectedApplicant.interviewStatus) && (
                    <div style={{ position: "relative" }}>
                      <div style={{ position: "absolute", left: "-25px", top: "4px", width: "10px", height: "10px", borderRadius: "50%", background: "#e1e2ed", boxShadow: "0 0 0 3px #111827" }} />
                      <p style={{ fontSize: "13px", color: "#e1e2ed" }}>Interview Completed</p>
                      <p style={{ fontSize: "11px", color: "#9aa0b4" }}>{selectedApplicant.interview?.endTime ? new Date(selectedApplicant.interview.endTime).toLocaleString() : "—"}</p>
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
        .glass-card {
            background: rgba(17, 24, 39, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(180, 197, 255, 0.1);
        }
        .neon-border-focus:focus-within {
            border-color: #b4c5ff;
            box-shadow: 0 0 15px rgba(180, 197, 255, 0.3);
        }
        .glow-cyan {
            text-shadow: 0 0 8px rgba(76, 215, 246, 0.5);
        }
      `}} />
    </div>
  );
}
