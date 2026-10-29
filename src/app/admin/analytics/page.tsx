"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/ui/LogoutButton";
import CustomCursor from "@/components/ui/CustomCursor";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Overview {
  total: number;
  waiting: number;
  interviewing: number;
  approved: number;
  pending: number;
  discussionNeeded: number;
}

interface NameCount { name: string; count: number; }
interface StatusCount { status: string; count: number; }

interface RecentApplicant {
  _id: string;
  name: string;
  rollNumber: string;
  department?: string;
  interviewStatus: string;
  createdAt: string;
}

interface AnalyticsData {
  overview: Overview;
  departments: NameCount[];
  status: StatusCount[];
  teams: NameCount[];
  recent: RecentApplicant[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Waiting:           "text-[#8A938D] bg-[#8A938D]/10",
  Interviewing:      "text-[#00FF66] bg-[#00FF66]/10 animate-pulse",
  Approved:          "text-[#00FF66] bg-[#00FF66]/10",
  Pending:           "text-[#FFB020] bg-[#FFB020]/10",
  "Discussion Needed": "text-[#FF4D4D] bg-[#FF4D4D]/10",
};

function statusColor(s: string) {
  return STATUS_COLORS[s] ?? "text-[#8A938D] bg-[#8A938D]/10";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const pathname = usePathname();

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/analytics");
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
    };
    load();
  }, []);

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!analyticsData) return;

    const lines: string[] = [];

    lines.push("NEXUS Analytics Report");
    lines.push(`Generated,${new Date().toLocaleString()}`);
    lines.push("");

    lines.push("OVERVIEW");
    lines.push("Metric,Count");
    const { overview } = analyticsData;
    lines.push(`Total Applicants,${overview.total}`);
    lines.push(`Waiting,${overview.waiting}`);
    lines.push(`Interviewing,${overview.interviewing}`);
    lines.push(`Approved,${overview.approved}`);
    lines.push(`Pending,${overview.pending}`);
    lines.push(`Discussion Needed,${overview.discussionNeeded}`);
    lines.push("");

    lines.push("DEPARTMENTS");
    lines.push("Department,Count");
    analyticsData.departments.forEach(d => lines.push(`"${d.name}",${d.count}`));
    lines.push("");

    lines.push("STATUS DISTRIBUTION");
    lines.push("Status,Count");
    analyticsData.status.forEach(s => lines.push(`"${s.status}",${s.count}`));
    lines.push("");

    lines.push("TEAMS");
    lines.push("Team,Count");
    analyticsData.teams.forEach(t => lines.push(`"${t.name}",${t.count}`));
    lines.push("");

    lines.push("RECENT ACTIVITY");
    lines.push("Name,Roll Number,Department,Status,Created At");
    analyticsData.recent.forEach(r =>
      lines.push(`"${r.name}","${r.rollNumber}","${r.department || ""}","${r.interviewStatus}","${new Date(r.createdAt).toLocaleString()}"`)
    );

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexus_analytics_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────
  const SkeletonCard = () => (
    <div className="bg-[#101412] p-5 rounded-xl border border-[#1D2A22] flex flex-col gap-1 animate-pulse">
      <div className="h-3 bg-[#0B0D0C] rounded w-1/2 mb-2" />
      <div className="h-8 bg-[#0B0D0C] rounded w-3/4" />
      <div className="h-2 bg-[#0B0D0C] rounded w-full mt-2" />
    </div>
  );

  // ── Bar segment for breakdowns ─────────────────────────────────────────────
  const BarRow = ({ label, count, max, accent }: { label: string; count: number; max: number; accent: string }) => {
    const pct = max > 0 ? Math.round((count / max) * 100) : 0;
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-[#F5F5F5] w-36 truncate shrink-0">{label}</span>
        <div className="flex-1 h-2 bg-[#0B0D0C] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${accent}`}
            style={{ width: `${pct}%`, transition: "width 0.6s ease" }}
          />
        </div>
        <span className="text-sm font-mono text-[#8A938D] w-8 text-right shrink-0">{count}</span>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#050505] text-[#F5F5F5] font-body-md selection:bg-[#00FF66]/30 selection:text-[#00FF66]">
      <CustomCursor />

      {/* SideNavBar ────────────────────────────────────────────────────────── */}
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
          {[
            { href: "/admin/dashboard",  icon: "dashboard",           label: "Dashboard" },
            { href: "/admin/applicants", icon: "group",               label: "Applicants" },
            { href: "/admin/rooms",      icon: "terminal",            label: "Rooms" },
            { href: "/admin/results",    icon: "assignment_turned_in",label: "Results" },
            { href: "/admin/analytics",  icon: "analytics",           label: "Analytics" },
            { href: "/admin/settings",   icon: "settings",            label: "Settings" },
          ].map(({ href, icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${
                pathname === href
                  ? "bg-[#00FF66]/10 text-[#00FF66] border-r-2 border-[#00FF66] shadow-[inset_0_0_12px_rgba(0,255,102,0.05)]"
                  : "text-[#8A938D] hover:text-[#F5F5F5] hover:bg-[#101412] hover:translate-x-1"
              }`}
            >
              <span className="material-symbols-outlined text-lg">{icon}</span>
              <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="px-4 mt-auto">
          <LogoutButton />
        </div>
      </aside>

      {/* Main ────────────────────────────────────────────────────────────────── */}
      <main className="md:ml-64 flex-1 flex flex-col min-h-screen relative">

        {/* Canvas */}
        <div className="flex-1 p-8 space-y-8 overflow-x-hidden max-w-[1440px] mx-auto w-full">

          {/* Page header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-wide text-[#F5F5F5] uppercase">Analytics Console</h2>
              <p className="text-xs text-[#8A938D] mt-1 font-semibold uppercase tracking-wider">
                Real-time recruitment insights powered by MongoDB.
              </p>
            </div>
            <button
              onClick={handleExportCSV}
              disabled={!analyticsData}
              className="px-5 py-2.5 bg-[#0B0D0C] hover:bg-[#00FF66] hover:text-[#050505] text-[#F5F5F5] border border-[#1D2A22] rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export Analytics CSV
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-[#FF4D4D]/10 border border-[#FF4D4D]/20 text-[#FF4D4D] p-4 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              <p className="text-xs font-semibold uppercase tracking-wider">{error}</p>
            </div>
          )}

          {/* ── Overview Cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            ) : analyticsData ? (
              <>
                <div className="bg-[#101412] p-5 rounded-xl border border-[#1D2A22] flex flex-col gap-1 hover:border-[#00FF66]/30 transition-all duration-300 shadow-md scan-line">
                  <span className="text-[9px] font-black text-[#00FF66] uppercase tracking-widest">Total Apps</span>
                  <span className="text-4xl font-black text-[#F5F5F5] tracking-tight">{analyticsData.overview.total}</span>
                  <div className="w-full h-1 bg-[#0B0D0C] rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-[#00FF66] rounded-full w-full shadow-[0_0_8px_rgba(0,255,102,0.5)]" />
                  </div>
                </div>
                <div className="bg-[#101412] p-5 rounded-xl border border-[#1D2A22] flex flex-col gap-1 hover:border-[#00FF66]/30 transition-all duration-300 shadow-md">
                  <span className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Waiting</span>
                  <span className="text-4xl font-black text-[#8A938D] tracking-tight">{analyticsData.overview.waiting}</span>
                  <p className="text-[9px] text-[#8A938D]/60 mt-1 uppercase font-bold tracking-wider">In queue</p>
                </div>
                <div className="bg-[#101412] p-5 rounded-xl border border-[#00FF66]/20 bg-[#00FF66]/5 flex flex-col gap-1 hover:border-[#00FF66]/40 transition-all duration-300 shadow-md">
                  <span className="text-[9px] font-black text-[#00FF66] uppercase tracking-widest">Interviewing</span>
                  <span className="text-4xl font-black text-[#00FF66] tracking-tight gradient-text">{analyticsData.overview.interviewing}</span>
                  <p className="text-[9px] text-[#00FF66]/70 mt-1 uppercase font-bold tracking-wider animate-pulse">Active now</p>
                </div>
                <div className="bg-[#101412] p-5 rounded-xl border border-[#1D2A22] flex flex-col gap-1 hover:border-[#00FF66]/30 transition-all duration-300 shadow-md">
                  <span className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Approved</span>
                  <span className="text-4xl font-black text-[#00FF66] tracking-tight">{analyticsData.overview.approved}</span>
                  <p className="text-[9px] text-[#8A938D]/60 mt-1 uppercase font-bold tracking-wider">Ready for offer</p>
                </div>
                <div className="bg-[#101412] p-5 rounded-xl border border-[#1D2A22] flex flex-col gap-1 hover:border-[#00FF66]/30 transition-all duration-300 shadow-md">
                  <span className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Pending</span>
                  <span className="text-4xl font-black text-[#FFB020] tracking-tight">{analyticsData.overview.pending}</span>
                  <p className="text-[9px] text-[#8A938D]/60 mt-1 uppercase font-bold tracking-wider">Awaiting action</p>
                </div>
                <div className="bg-[#101412] p-5 rounded-xl border border-[#1D2A22] flex flex-col gap-1 hover:border-[#00FF66]/30 transition-all duration-300 shadow-md">
                  <span className="text-[9px] font-black text-[#FF4D4D] uppercase tracking-widest">Attention</span>
                  <span className="text-4xl font-black text-[#FF4D4D] tracking-tight">{analyticsData.overview.discussionNeeded}</span>
                  <p className="text-[9px] text-[#8A938D]/60 mt-1 uppercase font-bold tracking-wider">Conflict in ratings</p>
                </div>
              </>
            ) : null}
          </div>

          {/* ── Middle Row: Departments + Status ──────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Department Analytics */}
            <div className="bg-[#101412] p-6 rounded-xl border border-[#1D2A22] flex flex-col gap-4 shadow-xl">
              <div className="flex items-center gap-2 mb-1 border-b border-[#1D2A22] pb-3">
                <span className="material-symbols-outlined text-[#00FF66] text-lg font-bold">school</span>
                <h3 className="text-sm font-black text-[#F5F5F5] uppercase tracking-widest">Department Breakdown</h3>
              </div>
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-3 bg-[#0B0D0C] rounded w-28" />
                      <div className="flex-1 h-2 bg-[#0B0D0C] rounded-full" />
                      <div className="h-3 bg-[#0B0D0C] rounded w-6" />
                    </div>
                  ))}
                </div>
              ) : analyticsData && analyticsData.departments.length > 0 ? (
                <div className="space-y-3">
                  {analyticsData.departments.map(d => (
                    <BarRow
                      key={d.name}
                      label={d.name}
                      count={d.count}
                      max={analyticsData.departments[0]?.count ?? 1}
                      accent="bg-[#00FF66] shadow-[0_0_8px_rgba(0,255,102,0.4)]"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-[#8A938D] text-xs font-semibold uppercase tracking-wider py-4">No department data available.</p>
              )}
            </div>

            {/* Status Distribution */}
            <div className="bg-[#101412] p-6 rounded-xl border border-[#1D2A22] flex flex-col gap-4 shadow-xl">
              <div className="flex items-center gap-2 mb-1 border-b border-[#1D2A22] pb-3">
                <span className="material-symbols-outlined text-[#00FF66] text-lg font-bold">donut_large</span>
                <h3 className="text-sm font-black text-[#F5F5F5] uppercase tracking-widest">Status Distribution</h3>
              </div>
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-3 bg-[#0B0D0C] rounded w-36" />
                      <div className="flex-1 h-2 bg-[#0B0D0C] rounded-full" />
                      <div className="h-3 bg-[#0B0D0C] rounded w-6" />
                    </div>
                  ))}
                </div>
              ) : analyticsData && analyticsData.status.length > 0 ? (
                <div className="space-y-3">
                  {analyticsData.status.map(s => {
                    const accentMap: Record<string, string> = {
                      Waiting: "bg-[#8A938D]",
                      Interviewing: "bg-[#00FF66] shadow-[0_0_8px_rgba(0,255,102,0.4)]",
                      Approved: "bg-[#00FF66]",
                      Pending: "bg-[#FFB020]",
                      "Discussion Needed": "bg-[#FF4D4D]",
                    };
                    return (
                      <div key={s.status} className="flex items-center gap-3">
                        <div className="flex items-center gap-2 w-44 shrink-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${accentMap[s.status] ?? "bg-[#8A938D]"}`} />
                          <span className="text-sm text-[#F5F5F5] truncate">{s.status}</span>
                        </div>
                        <div className="flex-1 h-2 bg-[#0B0D0C] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${accentMap[s.status] ?? "bg-[#8A938D]"}`}
                            style={{
                              width: `${analyticsData.overview.total > 0 ? Math.round((s.count / analyticsData.overview.total) * 100) : 0}%`,
                              transition: "width 0.6s ease",
                            }}
                          />
                        </div>
                        <span className="text-sm font-mono text-[#8A938D] w-8 text-right shrink-0">{s.count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[#8A938D] text-xs font-semibold uppercase tracking-wider py-4">No status data available.</p>
              )}
            </div>

          </div>

          {/* ── Team Breakdown ─────────────────────────────────────────────── */}
          {(!loading && analyticsData && analyticsData.teams.length > 0) && (
            <div className="bg-[#101412] p-6 rounded-xl border border-[#1D2A22] flex flex-col gap-4 shadow-xl">
              <div className="flex items-center gap-2 mb-1 border-b border-[#1D2A22] pb-3">
                <span className="material-symbols-outlined text-[#00FF66] text-lg font-bold">groups</span>
                <h3 className="text-sm font-black text-[#F5F5F5] uppercase tracking-widest">Applied Team Breakdown</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {analyticsData.teams.map(t => (
                  <div key={t.name} className="bg-[#0B0D0C]/40 border border-[#1D2A22] rounded-xl p-4 flex flex-col gap-1 hover:border-[#00FF66]/30 transition-all duration-300 shadow-md">
                    <p className="text-[10px] text-[#8A938D] font-bold uppercase tracking-wider truncate">{t.name}</p>
                    <p className="text-2xl font-black text-[#F5F5F5] tracking-tight">{t.count}</p>
                    <div className="w-full h-1 bg-[#0B0D0C] rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-[#00FF66]"
                        style={{
                          width: `${analyticsData.teams[0]?.count > 0 ? Math.round((t.count / analyticsData.teams[0].count) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Recent Activity ────────────────────────────────────────────── */}
          <div className="bg-[#101412] rounded-xl border border-[#1D2A22] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1D2A22] bg-[#0B0D0C]/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00FF66] text-lg font-bold">history</span>
                <h3 className="text-sm font-black text-[#F5F5F5] uppercase tracking-widest">Recent Synced Applicants</h3>
              </div>
              <span className="text-[10px] text-[#8A938D] font-bold uppercase tracking-wider">Latest 10 entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0B0D0C] border-b border-[#1D2A22]">
                    <th className="px-6 py-4 text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Name</th>
                    <th className="px-6 py-4 text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Roll Number</th>
                    <th className="px-6 py-4 text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Department</th>
                    <th className="px-6 py-4 text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[9px] font-black text-[#8A938D] uppercase tracking-widest text-right">Synced Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1D2A22]/50">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 bg-[#0B0D0C] rounded w-3/4" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-[#0B0D0C] rounded w-1/2" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-[#0B0D0C] rounded w-2/3" /></td>
                        <td className="px-6 py-4"><div className="h-5 bg-[#0B0D0C] rounded-full w-20" /></td>
                        <td className="px-6 py-4 text-right"><div className="h-4 bg-[#0B0D0C] rounded w-28 ml-auto" /></td>
                      </tr>
                    ))
                  ) : analyticsData && analyticsData.recent.length > 0 ? (
                    analyticsData.recent.map(a => (
                      <tr key={a._id} className="hover:bg-[#00FF66]/5 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-[#F5F5F5]">{a.name}</td>
                        <td className="px-6 py-4 text-sm text-[#8A938D] font-mono">{a.rollNumber}</td>
                        <td className="px-6 py-4 text-sm text-[#8A938D]">{a.department || "—"}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor(a.interviewStatus)}`}>
                            {a.interviewStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-[#8A938D] font-mono">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-[#8A938D]">
                        <span className="material-symbols-outlined text-4xl mb-2 text-[#8A938D]/40 block">person_off</span>
                        <span className="text-xs font-bold uppercase tracking-wider">No recent activity found.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>{/* /Canvas */}
      </main>

      {/* Global CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .gradient-text {
          background: linear-gradient(135deg, #00FF66 0%, #8A938D 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .scan-line::after {
          content:'';
          position:absolute; inset:0;
          background: linear-gradient(180deg, transparent 50%, rgba(0,255,102,0.02) 50%);
          background-size: 100% 4px;
          pointer-events: none;
        }
        .scan-line { position: relative; overflow: hidden; }
      ` }} />
    </div>
  );
}
