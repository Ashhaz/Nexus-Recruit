"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/ui/LogoutButton";
import CustomCursor from "@/components/ui/CustomCursor";

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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
        ok ? "bg-[#00FF66]/10 text-[#00FF66] border-[#00FF66]/20" : "bg-[#FF4D4D]/10 text-[#FF4D4D] border-[#FF4D4D]/20"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-[#00FF66] animate-pulse" : "bg-[#FF4D4D]"}`}
      />
      {ok ? "Connected" : "Disconnected"}
    </span>
  );

  const SkeletonLine = ({ w = "w-1/2" }: { w?: string }) => (
    <div className={`h-4 bg-[#0B0D0C] rounded animate-pulse ${w}`} />
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
    <div className="flex items-start gap-3 mb-6">
      <div className="w-9 h-9 rounded-lg bg-[#00FF66]/10 flex items-center justify-center flex-shrink-0 border border-[#00FF66]/20">
        <span className="material-symbols-outlined text-[#00FF66] text-[20px] font-bold">{icon}</span>
      </div>
      <div>
        <h3 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">{title}</h3>
        {subtitle && <p className="text-[10px] text-[#8A938D] font-semibold uppercase tracking-wider mt-0.5">{subtitle}</p>}
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
    <div className="flex items-center justify-between py-3 border-b border-[#1D2A22]/50 last:border-0">
      <span className="text-xs text-[#8A938D] font-bold uppercase tracking-wider">{label}</span>
      <span className="text-sm text-[#F5F5F5] font-semibold text-right">{value}</span>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#050505] text-[#F5F5F5] font-body-md selection:bg-[#00FF66]/30 selection:text-[#00FF66]">
      <CustomCursor />

      {/* SideNavBar ────────────────────────────────────────────────────────── */}
      <aside className="w-64 fixed left-0 top-0 z-40 bg-[#0B0D0C] border-r border-[#1D2A22] shadow-2xl flex-col h-full py-8 hidden md:flex">
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
            { href: "/admin/dashboard",  icon: "dashboard",            label: "Dashboard" },
            { href: "/admin/applicants", icon: "group",                label: "Applicants" },
            { href: "/admin/rooms",      icon: "terminal",             label: "Rooms" },
            { href: "/admin/results",    icon: "assignment_turned_in", label: "Results" },
            { href: "/admin/analytics",  icon: "analytics",            label: "Analytics" },
            { href: "/admin/settings",   icon: "settings",             label: "Settings" },
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
        <div className="flex-1 p-8 max-w-4xl mx-auto w-full space-y-6 overflow-x-hidden">

          {/* Page header */}
          <div className="mb-2">
            <h2 className="text-3xl font-black text-[#F5F5F5] uppercase tracking-wide drop-shadow-[0_0_8px_rgba(0,255,102,0.3)]">Settings</h2>
            <p className="text-xs text-[#8A938D] font-semibold uppercase tracking-wider mt-1.5">
              System configuration, status and administration.
            </p>
          </div>

          {/* ── 1. Admin Profile ─────────────────────────────────────────────── */}
          <section className="glass-card p-6 rounded-xl">
            <SectionHeading icon="manage_accounts" title="Admin Profile" subtitle="Current operator information" />
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-[#00FF66]/10 border border-[#00FF66]/20 flex items-center justify-center text-[#00FF66] flex-shrink-0">
                  <span className="material-symbols-outlined text-[32px]">shield_person</span>
                </div>
                <div>
                  <p className="text-lg font-black text-[#F5F5F5] uppercase tracking-wide">System Admin</p>
                  <p className="text-xs text-[#8A938D] font-bold mt-0.5 uppercase tracking-wider">Admin Role</p>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/20 uppercase tracking-wider mt-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
                    Active Session
                  </span>
                </div>
              </div>
              <button
                className="px-4 py-2.5 bg-[#0B0D0C] hover:bg-[#101412] hover:text-[#00FF66] border border-[#1D2A22] text-[#8A938D] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
                title="Edit profile — coming soon"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Edit Profile
              </button>
            </div>
          </section>

          {/* ── 2. System Status ──────────────────────────────────────────────── */}
          <section className="glass-card p-6 rounded-xl">
            <SectionHeading
              icon="health_and_safety"
              title="System Status"
              subtitle="Live connection and environment information"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* MongoDB */}
              <div className="bg-[#0B0D0C]/40 border border-[#1D2A22] rounded-lg p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#8A938D]">database</span>
                    <p className="text-[10px] font-bold text-[#8A938D] uppercase tracking-wider">MongoDB</p>
                  </div>
                  {settingsLoading ? (
                    <SkeletonLine w="w-20" />
                  ) : (
                    <StatusBadge ok={settings?.mongodbConnected ?? false} />
                  )}
                </div>
                <p className="text-sm font-semibold text-[#F5F5F5] mt-1">
                  {settingsLoading ? "—" : settings?.mongodbConnected ? "Atlas cluster connected" : "Not reachable"}
                </p>
              </div>

              {/* Google Sheets */}
              <div className="bg-[#0B0D0C]/40 border border-[#1D2A22] rounded-lg p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#8A938D]">table_chart</span>
                    <p className="text-[10px] font-bold text-[#8A938D] uppercase tracking-wider">Google Sheets</p>
                  </div>
                  {settingsLoading ? (
                    <SkeletonLine w="w-20" />
                  ) : (
                    <StatusBadge ok={settings?.googleSheetsConnected ?? false} />
                  )}
                </div>
                <p className="text-sm font-semibold text-[#F5F5F5] mt-1">
                  {settingsLoading ? "—" : settings?.googleSheetsConnected ? "Credentials configured" : "Missing credentials"}
                </p>
              </div>

              {/* Last Sync */}
              <div className="bg-[#0B0D0C]/40 border border-[#1D2A22] rounded-lg p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#8A938D]">sync</span>
                  <p className="text-[10px] font-bold text-[#8A938D] uppercase tracking-wider">Last Successful Sync</p>
                </div>
                {settingsLoading ? (
                  <SkeletonLine w="w-3/4" />
                ) : (
                  <p className="text-sm font-semibold text-[#F5F5F5] font-mono mt-1">
                    {settings?.lastSync
                      ? new Date(settings.lastSync).toLocaleString()
                      : "No sync recorded"}
                  </p>
                )}
              </div>

              {/* Total Applicants */}
              <div className="bg-[#0B0D0C]/40 border border-[#1D2A22] rounded-lg p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#8A938D]">group</span>
                  <p className="text-[10px] font-bold text-[#8A938D] uppercase tracking-wider">Total Applicants</p>
                </div>
                {settingsLoading ? (
                  <SkeletonLine w="w-16" />
                ) : (
                  <p className="text-2xl font-black text-[#00FF66] font-mono mt-1">
                    {settings?.totalApplicants ?? "—"}
                  </p>
                )}
              </div>

              {/* Environment */}
              <div className="bg-[#0B0D0C]/40 border border-[#1D2A22] rounded-lg p-4 flex flex-col gap-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#8A938D]">developer_mode</span>
                    <p className="text-[10px] font-bold text-[#8A938D] uppercase tracking-wider">Environment</p>
                  </div>
                  {!settingsLoading && settings && (
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                      settings.environment === "Production"
                        ? "bg-[#00FF66]/10 text-[#00FF66] border-[#00FF66]/20"
                        : "bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/20"
                    }`}>
                      {settings.environment}
                    </span>
                  )}
                </div>
                {settingsLoading ? (
                  <SkeletonLine w="w-1/3" />
                ) : (
                  <p className="text-sm font-semibold text-[#F5F5F5] mt-1">{settings?.environment ?? "—"}</p>
                )}
              </div>

            </div>
          </section>

          {/* ── 3. Synchronization ───────────────────────────────────────────── */}
          <section className="glass-card p-6 rounded-xl">
            <SectionHeading
              icon="cloud_sync"
              title="Synchronization"
              subtitle="Manage data synchronization from Google Sheets"
            />
            <div className="flex flex-col sm:flex-row gap-4">

              <div className="flex-1 bg-[#0B0D0C]/40 border border-[#1D2A22] rounded-lg p-4 flex flex-col gap-2">
                <p className="text-[9px] text-[#8A938D] uppercase tracking-wider font-bold">Last Sync</p>
                <p className="text-sm font-semibold text-[#F5F5F5] font-mono mt-1">
                  {settingsLoading
                    ? "—"
                    : settings?.lastSync
                    ? new Date(settings.lastSync).toLocaleString()
                    : "Never"}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:justify-end">
                <button
                  onClick={handleSync}
                  disabled={isSyncing || isRefreshing}
                  className="px-4 py-2.5 bg-[#00FF66] text-[#050505] hover:bg-[#00B84A] rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,102,0.35)] disabled:opacity-60 disabled:cursor-not-allowed font-black"
                >
                  {isSyncing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#050505]/30 border-t-[#050505] rounded-full animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px] font-bold">sync</span>
                      Sync Applicants
                    </>
                  )}
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={isSyncing || isRefreshing}
                  className="px-4 py-2.5 bg-[#0B0D0C] hover:bg-[#101412] hover:text-[#00FF66] border border-[#1D2A22] text-[#F5F5F5] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isRefreshing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#F5F5F5]/30 border-t-[#F5F5F5] rounded-full animate-spin" />
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
          <section className="glass-card p-6 rounded-xl">
            <SectionHeading
              icon="info"
              title="System Information"
              subtitle="Application build and runtime details"
            />
            <div className="bg-[#0B0D0C]/40 border border-[#1D2A22] rounded-lg px-4">
              <InfoRow label="Application Name" value="NEXUS Recruitment Engine" />
              <InfoRow
                label="Version"
                value={
                  <span className="font-mono text-[#00FF66]">
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
                  <span className="font-mono text-[#00FF66]">
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
                          ? "text-[#00FF66]"
                          : "text-[#FFB020]"
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
          <section className="border border-[#FF4D4D]/30 bg-[#FF4D4D]/5 rounded-xl p-6">
            <SectionHeading
              icon="warning"
              title="Danger Zone"
              subtitle="Irreversible client-side actions — proceed with caution"
            />
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleClearCache}
                className="flex-1 px-4 py-2.5 bg-[#FF4D4D]/10 hover:bg-[#FF4D4D]/20 text-[#FF4D4D] border border-[#FF4D4D]/30 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                Clear Local Cache
              </button>
              <button
                onClick={handleReload}
                className="flex-1 px-4 py-2.5 bg-[#FF4D4D]/10 hover:bg-[#FF4D4D]/20 text-[#FF4D4D] border border-[#FF4D4D]/30 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                Reload Application
              </button>
            </div>
            <p className="text-[10px] text-[#FF4D4D]/60 mt-4 uppercase font-bold tracking-wider">
              These actions only affect your browser session. No database data is modified.
            </p>
          </section>

        </div>{/* /Canvas */}
      </main>

      {/* Toast ────────────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl flex items-start gap-4 shadow-2xl border bg-[#101412] max-w-sm ${
            toast.type === "success" ? "border-[#00FF66]/30 text-[#00FF66]" : "border-[#FF4D4D]/30 text-[#FF4D4D]"
          }`}
        >
          <span className="material-symbols-outlined mt-0.5 flex-shrink-0">
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          <p className="font-body-md text-[#F5F5F5] text-xs font-bold uppercase tracking-wider flex-1">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="text-[#8A938D] hover:text-[#F5F5F5] ml-2 flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Global CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .glass-card {
          background: #101412;
          border: 1px solid #1D2A22;
        }
      ` }} />
    </div>
  );
}
