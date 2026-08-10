"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/ui/LogoutButton";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SettingsData {
  mongodbConnected: boolean;
  googleSheetsConnected: boolean;
  lastSync: string | null;
  totalApplicants: number;
  environment: string;
  version: string;
  nodeVersion: string;
}

interface Toast {
  message: string;
  type: "success" | "error";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const pathname = usePathname();

  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // ── Load settings ──────────────────────────────────────────────────────────

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success && json.data) {
        setSettings(json.data);
      }
    } catch {
      // silently fail — error states handled per-card
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ── Sync Applicants ────────────────────────────────────────────────────────

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/applicants/sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Sync failed");
      showToast(
        `Sync Complete! Imported: ${json.imported} · Updated: ${json.updated} · Skipped: ${json.skipped}`,
        "success"
      );
      await loadSettings(); // refresh lastSync / totalApplicants
    } catch (e: any) {
      showToast(e.message || "Sync failed", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Refresh Statistics ─────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadSettings();
      showToast("Statistics refreshed successfully.", "success");
    } catch {
      showToast("Failed to refresh statistics.", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // ── Danger Zone ────────────────────────────────────────────────────────────

  const handleClearCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      showToast("Local browser cache cleared.", "success");
    } catch {
      showToast("Nothing to clear.", "error");
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  // ── Sub-components ─────────────────────────────────────────────────────────

  const StatusBadge = ({ ok }: { ok: boolean }) => (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-label-sm uppercase tracking-wider ${
        ok ? "bg-secondary/10 text-secondary" : "bg-error/10 text-error"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-secondary animate-pulse" : "bg-error"}`}
      />
      {ok ? "Connected" : "Disconnected"}
    </span>
  );

  const SkeletonLine = ({ w = "w-1/2" }: { w?: string }) => (
    <div className={`h-4 bg-surface-variant/40 rounded animate-pulse ${w}`} />
  );

  const SectionHeading = ({
    icon,
    title,
    subtitle,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
  }) => (
    <div className="flex items-start gap-3 mb-lg">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
      </div>
      <div>
        <h3 className="font-headline-sm text-on-surface">{title}</h3>
        {subtitle && <p className="text-xs text-on-surface-variant mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );

  const InfoRow = ({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between py-3 border-b border-outline-variant/10 last:border-0">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span className="text-sm text-on-surface font-medium text-right">{value}</span>
    </div>
  );

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
            { href: "/admin/dashboard",  icon: "dashboard",            label: "Dashboard" },
            { href: "/admin/applicants", icon: "group",                label: "Applicants" },
            { href: "/admin/rooms",      icon: "terminal",             label: "Interview Rooms" },
            { href: "/admin/results",    icon: "assignment_turned_in", label: "Results" },
            { href: "/admin/analytics",  icon: "analytics",            label: "Analytics" },
            { href: "/admin/settings",   icon: "settings",             label: "Settings" },
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
            <span className="font-headline-md text-headline-md font-bold tracking-tighter text-primary drop-shadow-[0_0_8px_rgba(180,197,255,0.5)] md:hidden">NEXUS</span>
            <div className="flex items-center gap-md ml-auto">
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
        <div className="flex-1 p-lg max-w-4xl mx-auto w-full space-y-lg overflow-x-hidden">

          {/* Page header */}
          <div className="mb-2">
            <h2 className="font-headline-lg text-headline-lg text-primary glow-cyan">Settings</h2>
            <p className="text-on-surface-variant font-body-md text-body-md mt-sm">
              System configuration, status and administration.
            </p>
          </div>

          {/* ── 1. Admin Profile ─────────────────────────────────────────────── */}
          <section className="glass-card p-lg rounded-xl">
            <SectionHeading icon="manage_accounts" title="Admin Profile" subtitle="Current operator information" />
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-primary flex-shrink-0">
                  <span className="material-symbols-outlined text-[32px]">shield_person</span>
                </div>
                <div>
                  <p className="text-lg font-semibold text-on-surface">System Admin</p>
                  <p className="text-sm text-on-surface-variant">Admin Role</p>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] bg-secondary/10 text-secondary uppercase tracking-wider mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                    Active Session
                  </span>
                </div>
              </div>
              <button
                className="px-md py-sm bg-surface-variant/30 hover:bg-surface-variant/50 text-on-surface-variant hover:text-on-surface border border-outline-variant/30 rounded-xl text-sm font-label-md transition-colors flex items-center gap-2"
                title="Edit profile — coming soon"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Edit Profile
              </button>
            </div>
          </section>

          {/* ── 2. System Status ──────────────────────────────────────────────── */}
          <section className="glass-card p-lg rounded-xl">
            <SectionHeading
              icon="health_and_safety"
              title="System Status"
              subtitle="Live connection and environment information"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">

              {/* MongoDB */}
              <div className="bg-surface-variant/10 border border-outline-variant/10 rounded-xl p-md flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">database</span>
                    <p className="text-xs font-label-sm text-on-surface-variant uppercase tracking-wider">MongoDB</p>
                  </div>
                  {settingsLoading ? (
                    <SkeletonLine w="w-20" />
                  ) : (
                    <StatusBadge ok={settings?.mongodbConnected ?? false} />
                  )}
                </div>
                <p className="text-sm text-on-surface">
                  {settingsLoading ? "—" : settings?.mongodbConnected ? "Atlas cluster connected" : "Not reachable"}
                </p>
              </div>

              {/* Google Sheets */}
              <div className="bg-surface-variant/10 border border-outline-variant/10 rounded-xl p-md flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">table_chart</span>
                    <p className="text-xs font-label-sm text-on-surface-variant uppercase tracking-wider">Google Sheets</p>
                  </div>
                  {settingsLoading ? (
                    <SkeletonLine w="w-20" />
                  ) : (
                    <StatusBadge ok={settings?.googleSheetsConnected ?? false} />
                  )}
                </div>
                <p className="text-sm text-on-surface">
                  {settingsLoading ? "—" : settings?.googleSheetsConnected ? "Credentials configured" : "Missing credentials"}
                </p>
              </div>

              {/* Last Sync */}
              <div className="bg-surface-variant/10 border border-outline-variant/10 rounded-xl p-md flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">sync</span>
                  <p className="text-xs font-label-sm text-on-surface-variant uppercase tracking-wider">Last Successful Sync</p>
                </div>
                {settingsLoading ? (
                  <SkeletonLine w="w-3/4" />
                ) : (
                  <p className="text-sm text-on-surface font-mono">
                    {settings?.lastSync
                      ? new Date(settings.lastSync).toLocaleString()
                      : "No sync recorded"}
                  </p>
                )}
              </div>

              {/* Total Applicants */}
              <div className="bg-surface-variant/10 border border-outline-variant/10 rounded-xl p-md flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">group</span>
                  <p className="text-xs font-label-sm text-on-surface-variant uppercase tracking-wider">Total Applicants</p>
                </div>
                {settingsLoading ? (
                  <SkeletonLine w="w-16" />
                ) : (
                  <p className="text-2xl font-bold text-primary font-mono">
                    {settings?.totalApplicants ?? "—"}
                  </p>
                )}
              </div>

              {/* Environment */}
              <div className="bg-surface-variant/10 border border-outline-variant/10 rounded-xl p-md flex flex-col gap-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">developer_mode</span>
                    <p className="text-xs font-label-sm text-on-surface-variant uppercase tracking-wider">Environment</p>
                  </div>
                  {!settingsLoading && settings && (
                    <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-label-sm ${
                      settings.environment === "Production"
                        ? "bg-secondary/10 text-secondary"
                        : "bg-yellow-400/10 text-yellow-400"
                    }`}>
                      {settings.environment}
                    </span>
                  )}
                </div>
                {settingsLoading ? (
                  <SkeletonLine w="w-1/3" />
                ) : (
                  <p className="text-sm text-on-surface">{settings?.environment ?? "—"}</p>
                )}
              </div>

            </div>
          </section>

          {/* ── 3. Synchronization ───────────────────────────────────────────── */}
          <section className="glass-card p-lg rounded-xl">
            <SectionHeading
              icon="cloud_sync"
              title="Synchronization"
              subtitle="Manage data synchronization from Google Sheets"
            />
            <div className="flex flex-col sm:flex-row gap-md">

              <div className="flex-1 bg-surface-variant/10 border border-outline-variant/10 rounded-xl p-md flex flex-col gap-2">
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-label-sm">Last Sync</p>
                <p className="text-sm text-on-surface font-mono">
                  {settingsLoading
                    ? "—"
                    : settings?.lastSync
                    ? new Date(settings.lastSync).toLocaleString()
                    : "Never"}
                </p>
              </div>

              <div className="flex flex-col gap-sm sm:justify-end">
                <button
                  onClick={handleSync}
                  disabled={isSyncing || isRefreshing}
                  className="px-md py-sm bg-primary text-on-primary hover:bg-primary/90 rounded-xl font-label-md text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(180,197,255,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSyncing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">sync</span>
                      Sync Applicants
                    </>
                  )}
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={isSyncing || isRefreshing}
                  className="px-md py-sm bg-surface-variant/30 hover:bg-surface-variant/50 text-on-surface border border-outline-variant/30 rounded-xl font-label-md text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isRefreshing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-on-surface/30 border-t-on-surface rounded-full animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">refresh</span>
                      Refresh Statistics
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* ── 4. System Information ─────────────────────────────────────────── */}
          <section className="glass-card p-lg rounded-xl">
            <SectionHeading
              icon="info"
              title="System Information"
              subtitle="Application build and runtime details"
            />
            <div className="bg-surface-variant/10 border border-outline-variant/10 rounded-xl px-md">
              <InfoRow label="Application Name" value="NEXUS Recruitment Engine" />
              <InfoRow
                label="Version"
                value={
                  <span className="font-mono text-primary">
                    {settingsLoading ? "—" : settings?.version ?? "v1.0.0"}
                  </span>
                }
              />
              <InfoRow label="Framework" value="Next.js (App Router)" />
              <InfoRow label="Database" value="MongoDB Atlas" />
              <InfoRow label="Data Source" value="Google Sheets API" />
              <InfoRow
                label="Node Version"
                value={
                  <span className="font-mono text-secondary">
                    {settingsLoading ? "—" : settings?.nodeVersion ?? "—"}
                  </span>
                }
              />
              <InfoRow
                label="Environment"
                value={
                  settingsLoading ? (
                    "—"
                  ) : (
                    <span
                      className={
                        settings?.environment === "Production"
                          ? "text-secondary"
                          : "text-yellow-400"
                      }
                    >
                      {settings?.environment ?? "—"}
                    </span>
                  )
                }
              />
            </div>
          </section>

          {/* ── 5. Danger Zone ────────────────────────────────────────────────── */}
          <section className="border border-error/30 bg-error/5 rounded-xl p-lg">
            <SectionHeading
              icon="warning"
              title="Danger Zone"
              subtitle="Irreversible client-side actions — proceed with caution"
            />
            <div className="flex flex-col sm:flex-row gap-md">
              <button
                onClick={handleClearCache}
                className="flex-1 px-md py-sm bg-error/10 hover:bg-error/20 text-error border border-error/30 rounded-xl font-label-md text-sm transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                Clear Local Cache
              </button>
              <button
                onClick={handleReload}
                className="flex-1 px-md py-sm bg-error/10 hover:bg-error/20 text-error border border-error/30 rounded-xl font-label-md text-sm transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                Reload Application
              </button>
            </div>
            <p className="text-xs text-error/60 mt-md">
              These actions only affect your browser session. No database data is modified.
            </p>
          </section>

        </div>{/* /Canvas */}
      </main>

      {/* Toast ────────────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-md rounded-xl flex items-start gap-md shadow-2xl border bg-surface-container backdrop-blur-xl max-w-sm ${
            toast.type === "success" ? "border-secondary/50 text-secondary" : "border-error/50 text-error"
          }`}
        >
          <span className="material-symbols-outlined mt-0.5 flex-shrink-0">
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          <p className="font-body-md text-on-surface text-sm flex-1">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="text-on-surface-variant hover:text-on-surface ml-2 flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Global CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .glass-card {
          background: rgba(17, 24, 39, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(180, 197, 255, 0.1);
        }
        .glow-cyan { text-shadow: 0 0 8px rgba(76, 215, 246, 0.5); }
      ` }} />
    </div>
  );
}
