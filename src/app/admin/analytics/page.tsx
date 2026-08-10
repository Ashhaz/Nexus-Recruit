"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/ui/LogoutButton";

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
  Waiting:           "text-on-surface-variant bg-surface-variant/30",
  Interviewing:      "text-primary bg-primary/10",
  Approved:          "text-secondary bg-secondary/10",
  Pending:           "text-yellow-400 bg-yellow-400/10",
  "Discussion Needed": "text-error bg-error/10",
};

function statusColor(s: string) {
  return STATUS_COLORS[s] ?? "text-on-surface-variant bg-surface-variant/30";
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
    <div className="glass-card p-md rounded-xl flex flex-col gap-xs animate-pulse">
      <div className="h-3 bg-surface-variant/40 rounded w-1/2 mb-2" />
      <div className="h-8 bg-surface-variant/30 rounded w-3/4" />
      <div className="h-2 bg-surface-variant/20 rounded w-full mt-2" />
    </div>
  );

  // ── Bar segment for breakdowns ─────────────────────────────────────────────
  const BarRow = ({ label, count, max, accent }: { label: string; count: number; max: number; accent: string }) => {
    const pct = max > 0 ? Math.round((count / max) * 100) : 0;
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-on-surface w-36 truncate shrink-0">{label}</span>
        <div className="flex-1 h-2 bg-surface-variant/30 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${accent}`}
            style={{ width: `${pct}%`, transition: "width 0.6s ease" }}
          />
        </div>
        <span className="text-sm font-mono text-on-surface-variant w-8 text-right shrink-0">{count}</span>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-[#e1e2ed] font-body-md selection:bg-primary/30 selection:text-primary">

      {/* SideNavBar ────────────────────────────────────────────────────────── */}
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
          {[
            { href: "/admin/dashboard",  icon: "dashboard",           label: "Dashboard" },
            { href: "/admin/applicants", icon: "group",               label: "Applicants" },
            { href: "/admin/rooms",      icon: "terminal",            label: "Interview Rooms" },
            { href: "/admin/results",    icon: "assignment_turned_in",label: "Results" },
            { href: "/admin/analytics",  icon: "analytics",           label: "Analytics" },
            { href: "/admin/settings",   icon: "settings",            label: "Settings" },
          ].map(({ href, icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-md px-md py-sm transition-all duration-300 ${
                pathname === href
                  ? "bg-primary/10 text-primary border-r-2 border-primary shadow-[inset_0_0_12px_rgba(180,197,255,0.2)]"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/30 hover:translate-x-1 transition-transform"
              }`}
            >
              <span className="material-symbols-outlined">{icon}</span>
              <span className="font-label-md text-label-md">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="px-sm mt-auto">
          <LogoutButton />
        </div>
      </aside>

      {/* Main ────────────────────────────────────────────────────────────────── */}
      <main className="md:ml-64 flex-1 flex flex-col min-h-screen relative">

        {/* TopNavBar */}
        <header className="w-full sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between px-gutter h-16 w-full max-w-container-max mx-auto">
            <div className="flex items-center gap-xl">
              <span className="font-headline-md text-headline-md font-bold tracking-tighter text-primary drop-shadow-[0_0_8px_rgba(180,197,255,0.5)] md:hidden">NEXUS</span>
            </div>
            <div className="flex items-center gap-md">
              <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-full transition-all active:scale-95">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <div className="h-8 w-[1px] bg-outline-variant/30 mx-1" />
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

        {/* Canvas */}
        <div className="flex-1 p-lg space-y-lg overflow-x-hidden">

          {/* Page header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-2">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-primary glow-cyan">Analytics</h2>
              <p className="text-on-surface-variant font-body-md text-body-md mt-sm">
                Real-time recruitment insights powered by MongoDB.
              </p>
            </div>
            <button
              onClick={handleExportCSV}
              disabled={!analyticsData}
              className="flex items-center gap-2 px-md py-sm bg-surface-variant/30 hover:bg-surface-variant/50 text-on-surface border border-outline-variant/30 rounded-xl font-label-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export Analytics CSV
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-error/10 border border-error/20 text-error p-4 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              <p>{error}</p>
            </div>
          )}

          {/* ── Overview Cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-md">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            ) : analyticsData ? (
              <>
                <div className="glass-card p-md rounded-xl flex flex-col gap-xs scan-line">
                  <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider">Total Apps</span>
                  <span className="font-headline-lg text-headline-lg font-bold">{analyticsData.overview.total}</span>
                  <div className="w-full h-1 bg-surface-variant rounded-full mt-sm">
                    <div className="h-full bg-primary rounded-full w-full shadow-[0_0_8px_rgba(180,197,255,0.5)]" />
                  </div>
                </div>
                <div className="glass-card p-md rounded-xl flex flex-col gap-xs">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Waiting</span>
                  <span className="font-headline-lg text-headline-lg font-bold">{analyticsData.overview.waiting}</span>
                  <p className="text-[12px] text-on-surface-variant">In queue</p>
                </div>
                <div className="glass-card p-md rounded-xl flex flex-col gap-xs border-primary/20 bg-primary/5">
                  <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Interviewing</span>
                  <span className="font-headline-lg text-headline-lg font-bold gradient-text">{analyticsData.overview.interviewing}</span>
                  <p className="text-[12px] text-on-surface-variant">Active now</p>
                </div>
                <div className="glass-card p-md rounded-xl flex flex-col gap-xs">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Approved</span>
                  <span className="font-headline-lg text-headline-lg font-bold text-secondary">{analyticsData.overview.approved}</span>
                  <p className="text-[12px] text-on-surface-variant">Ready for offer</p>
                </div>
                <div className="glass-card p-md rounded-xl flex flex-col gap-xs">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Pending</span>
                  <span className="font-headline-lg text-headline-lg font-bold">{analyticsData.overview.pending}</span>
                  <p className="text-[12px] text-on-surface-variant">Awaiting action</p>
                </div>
                <div className="glass-card p-md rounded-xl flex flex-col gap-xs">
                  <span className="font-label-sm text-label-sm text-error uppercase tracking-wider">Attention</span>
                  <span className="font-headline-lg text-headline-lg font-bold text-error">{analyticsData.overview.discussionNeeded}</span>
                  <p className="text-[12px] text-on-surface-variant">Conflict in ratings</p>
                </div>
              </>
            ) : null}
          </div>

          {/* ── Middle Row: Departments + Status ──────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">

            {/* Department Analytics */}
            <div className="glass-card p-lg rounded-xl flex flex-col gap-md">
              <div className="flex items-center gap-2 mb-sm">
                <span className="material-symbols-outlined text-primary text-[20px]">school</span>
                <h3 className="font-headline-sm text-on-surface">Department Breakdown</h3>
              </div>
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-3 bg-surface-variant/40 rounded w-28" />
                      <div className="flex-1 h-2 bg-surface-variant/30 rounded-full" />
                      <div className="h-3 bg-surface-variant/30 rounded w-6" />
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
                      accent="bg-primary"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-on-surface-variant text-sm">No department data available.</p>
              )}
            </div>

            {/* Status Distribution */}
            <div className="glass-card p-lg rounded-xl flex flex-col gap-md">
              <div className="flex items-center gap-2 mb-sm">
                <span className="material-symbols-outlined text-secondary text-[20px]">donut_large</span>
                <h3 className="font-headline-sm text-on-surface">Status Distribution</h3>
              </div>
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-3 bg-surface-variant/40 rounded w-36" />
                      <div className="flex-1 h-2 bg-surface-variant/30 rounded-full" />
                      <div className="h-3 bg-surface-variant/30 rounded w-6" />
                    </div>
                  ))}
                </div>
              ) : analyticsData && analyticsData.status.length > 0 ? (
                <div className="space-y-3">
                  {analyticsData.status.map(s => {
                    const accentMap: Record<string, string> = {
                      Waiting: "bg-on-surface-variant",
                      Interviewing: "bg-primary",
                      Approved: "bg-secondary",
                      Pending: "bg-yellow-400",
                      "Discussion Needed": "bg-error",
                    };
                    return (
                      <div key={s.status} className="flex items-center gap-3">
                        <div className="flex items-center gap-2 w-44 shrink-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${accentMap[s.status] ?? "bg-on-surface-variant"}`} />
                          <span className="text-sm text-on-surface truncate">{s.status}</span>
                        </div>
                        <div className="flex-1 h-2 bg-surface-variant/30 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${accentMap[s.status] ?? "bg-on-surface-variant"}`}
                            style={{
                              width: `${analyticsData.overview.total > 0 ? Math.round((s.count / analyticsData.overview.total) * 100) : 0}%`,
                              transition: "width 0.6s ease",
                            }}
                          />
                        </div>
                        <span className="text-sm font-mono text-on-surface-variant w-8 text-right shrink-0">{s.count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-on-surface-variant text-sm">No status data available.</p>
              )}
            </div>

          </div>

          {/* ── Team Breakdown ─────────────────────────────────────────────── */}
          {(!loading && analyticsData && analyticsData.teams.length > 0) && (
            <div className="glass-card p-lg rounded-xl flex flex-col gap-md">
              <div className="flex items-center gap-2 mb-sm">
                <span className="material-symbols-outlined text-primary text-[20px]">groups</span>
                <h3 className="font-headline-sm text-on-surface">Applied Team Breakdown</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-md">
                {analyticsData.teams.map(t => (
                  <div key={t.name} className="bg-surface-variant/10 border border-outline-variant/15 rounded-xl p-md flex flex-col gap-xs">
                    <p className="text-xs text-on-surface-variant truncate">{t.name}</p>
                    <p className="font-headline-sm text-on-surface font-bold">{t.count}</p>
                    <div className="w-full h-1 bg-surface-variant rounded-full mt-1">
                      <div
                        className="h-full bg-secondary rounded-full"
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
          <div className="glass-card rounded-xl border border-outline-variant/20 overflow-hidden">
            <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">history</span>
                <h3 className="font-headline-sm text-on-surface">Recent Activity</h3>
              </div>
              <span className="text-xs text-on-surface-variant">Latest 10 applicants</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-variant/10 border-b border-outline-variant/20">
                    <th className="px-4 py-3 text-xs font-label-sm text-on-surface-variant uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-xs font-label-sm text-on-surface-variant uppercase tracking-wider">Roll Number</th>
                    <th className="px-4 py-3 text-xs font-label-sm text-on-surface-variant uppercase tracking-wider">Department</th>
                    <th className="px-4 py-3 text-xs font-label-sm text-on-surface-variant uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-xs font-label-sm text-on-surface-variant uppercase tracking-wider text-right">Synced</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-4 py-3"><div className="h-4 bg-surface-variant/40 rounded w-3/4" /></td>
                        <td className="px-4 py-3"><div className="h-4 bg-surface-variant/30 rounded w-1/2" /></td>
                        <td className="px-4 py-3"><div className="h-4 bg-surface-variant/30 rounded w-2/3" /></td>
                        <td className="px-4 py-3"><div className="h-5 bg-surface-variant/30 rounded-full w-20" /></td>
                        <td className="px-4 py-3 text-right"><div className="h-4 bg-surface-variant/20 rounded w-28 ml-auto" /></td>
                      </tr>
                    ))
                  ) : analyticsData && analyticsData.recent.length > 0 ? (
                    analyticsData.recent.map(a => (
                      <tr key={a._id} className="hover:bg-primary/5 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-on-surface">{a.name}</td>
                        <td className="px-4 py-3 text-sm text-on-surface-variant">{a.rollNumber}</td>
                        <td className="px-4 py-3 text-sm text-on-surface-variant">{a.department || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-label-sm uppercase tracking-wider ${statusColor(a.interviewStatus)}`}>
                            {a.interviewStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-on-surface-variant">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-40 block">person_off</span>
                        No recent activity found.
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
        .glass-card {
          background: rgba(17, 24, 39, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(180, 197, 255, 0.1);
        }
        .glow-cyan { text-shadow: 0 0 8px rgba(76, 215, 246, 0.5); }
        .gradient-text {
          background: linear-gradient(135deg, #b4c5ff 0%, #4cd7f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .scan-line::after {
          content:'';
          position:absolute; inset:0;
          background: linear-gradient(180deg, transparent 50%, rgba(180,197,255,0.03) 50%);
          background-size: 100% 4px;
          pointer-events: none;
        }
        .scan-line { position: relative; overflow: hidden; }
      ` }} />
    </div>
  );
}
