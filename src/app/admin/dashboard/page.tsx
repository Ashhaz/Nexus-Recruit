"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LogoutButton from "@/components/ui/LogoutButton";
import CustomCursor from "@/components/ui/CustomCursor";

// ── Types ────────────────────────────────────────────────────────────────────

interface StatsData {
  totalApplicants: number | null;
  waiting: number | null;
  interviewing: number | null;
  approved: number | null;
  pending: number | null;
  discussionNeeded: number | null;
}

interface ApplicantResult {
  _id: string;
  name: string;
  rollNumber: string;
}

interface RoomData {
  _id: string;
  roomNumber: number;
  interviewer: string;
  applicant: ApplicantResult | null;
  status: "Available" | "Occupied";
  startedAt: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const pathname = usePathname();
  const router = useRouter();

  // ── Sync ──────────────────────────────────────────────────────────────────
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<StatsData>({
    totalApplicants: null,
    waiting: null,
    interviewing: null,
    approved: null,
    pending: null,
    discussionNeeded: null,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Rooms ─────────────────────────────────────────────────────────────────
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  };

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/dashboard/stats");
      const json = await res.json();
      if (json.success && json.data) {
        setStats(json.data);
      } else {
        setStats({ totalApplicants: null, waiting: null, interviewing: null, approved: null, pending: null, discussionNeeded: null });
      }
    } catch {
      setStats({ totalApplicants: null, waiting: null, interviewing: null, approved: null, pending: null, discussionNeeded: null });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const res = await fetch("/api/rooms");
      const json = await res.json();
      if (json.success && json.rooms) {
        setRooms(json.rooms);
      }
    } catch {
      // silently keep previous state
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchRooms();
    const interval = setInterval(() => {
      fetchStats();
      fetchRooms();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchRooms]);

  // ── Sync handler ──────────────────────────────────────────────────────────

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/applicants/sync", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync applicants");
      }

      router.refresh();

      showToast(
        `Sync Complete!\nImported: ${data.imported}\nUpdated: ${data.updated}\nFailed: ${data.skipped}`,
        "success"
      );
      fetchStats();
    } catch (error: any) {
      showToast(error.message || "An unexpected error occurred", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Room card helper ──────────────────────────────────────────────────────

  const RoomCard = ({ room }: { room: RoomData }) => {
    const isOccupied = room.status === "Occupied";
    const formattedRoomNumber = String(room.roomNumber).padStart(2, "0");

    return (
      <div 
        className={`bg-[#101412] p-6 rounded-xl flex flex-col gap-5 border transition-all duration-300 shadow-xl relative overflow-hidden group hover:-translate-y-1 ${
          isOccupied 
            ? "border-[#00FF66]/30 hover:border-[#00FF66]/60 shadow-[0_0_15px_rgba(0,255,102,0.05)]" 
            : "border-[#1D2A22] hover:border-[#8A938D]/30"
        }`}
      >
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <span className="material-symbols-outlined text-6xl text-[#00FF66]">meeting_room</span>
        </div>
        
        <div className="flex items-center justify-between z-10">
          <h4 className="text-sm font-bold text-[#F5F5F5] tracking-widest uppercase">ROOM {formattedRoomNumber}</h4>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isOccupied
                ? "bg-[#00FF66]/10 text-[#00FF66]"
                : "bg-[#8A938D]/10 text-[#8A938D]"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOccupied ? "bg-[#00FF66] animate-pulse" : "bg-[#8A938D]"}`}></span>
            {isOccupied ? "LIVE" : "AVAILABLE"}
          </span>
        </div>

        <div className="space-y-4 z-10 flex-1">
          {isOccupied ? (
            <>
              <div>
                <p className="text-[9px] text-[#8A938D] font-black uppercase tracking-wider mb-1">
                  Interviewer
                </p>
                <p className="text-sm font-semibold text-[#F5F5F5]">
                  {room.interviewer || "—"}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-[#8A938D] font-black uppercase tracking-wider mb-1">
                  Candidate
                </p>
                {room.applicant ? (
                  <>
                    <p className="text-sm font-bold text-[#00FF66]">{room.applicant.name}</p>
                    <p className="text-xs text-[#8A938D] font-mono mt-0.5">{room.applicant.rollNumber}</p>
                  </>
                ) : (
                  <p className="text-sm font-medium text-[#8A938D]">—</p>
                )}
              </div>
            </>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center text-center gap-2 border border-dashed border-[#1D2A22] rounded-lg bg-[#0B0D0C]/40">
              <span className="material-symbols-outlined text-xl text-[#8A938D]/40">check_circle</span>
              <p className="text-[11px] font-bold text-[#8A938D] uppercase tracking-wider">Ready for Interview</p>
              <p className="text-[9px] text-[#8A938D]/60 max-w-[160px] leading-tight">Waiting for interviewer to join room</p>
            </div>
          )}
        </div>

        <Link
          href={`/interviewer/workspace?room=${room.roomNumber}`}
          className="mt-4 w-full py-2.5 bg-[#0B0D0C] hover:bg-[#00FF66] hover:text-[#050505] rounded-lg text-[10px] font-bold uppercase tracking-wider text-[#F5F5F5] transition-all border border-[#1D2A22] z-10 flex items-center justify-center gap-2 group-hover:border-[#00FF66]/30 shadow-md"
        >
          <span className="material-symbols-outlined text-[14px]">visibility</span>
          View Room
        </Link>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

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

      {/* Main Content Wrapper */}
      <main className="md:ml-64 flex-1 flex flex-col min-h-screen relative">

        {/* TopNavBar */}
        <header className="w-full sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-[#1D2A22] shadow-sm">
          <div className="flex items-center justify-between px-8 h-16 w-full max-w-container-max mx-auto">
            <div className="flex items-center gap-xl">
              <span className="text-xl font-black text-[#00FF66] drop-shadow-[0_0_8px_rgba(0,255,102,0.4)] md:hidden">NEXUS</span>
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

        {/* Dashboard Canvas */}
        <div className="flex-1 p-8 space-y-8 overflow-x-hidden max-w-[1440px] mx-auto w-full">

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-wide text-[#F5F5F5] uppercase">System Dashboard</h2>
              <p className="text-xs text-[#8A938D] mt-1 font-semibold uppercase tracking-wider">Real-time recruitment performance &amp; room telemetry.</p>
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="px-5 py-2.5 bg-[#00FF66] text-[#050505] hover:bg-[#00B84A] rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,102,0.35)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {isSyncing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#050505]/30 border-t-[#050505] rounded-full animate-spin"></div>
                    Syncing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[14px]">sync</span>
                    Sync Applicants
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Total Applicants */}
            <div className="bg-[#101412] p-5 rounded-xl border border-[#1D2A22] flex flex-col gap-1 hover:border-[#00FF66]/30 transition-all duration-300 shadow-md">
              <span className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Total Apps</span>
              <span className="text-4xl font-black text-[#F5F5F5] tracking-tight">{statsLoading ? '…' : (stats.totalApplicants ?? '--')}</span>
              <div className="w-full h-1 bg-[#0B0D0C] rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-[#00FF66] w-full rounded-full shadow-[0_0_8px_rgba(0,255,102,0.5)]"></div>
              </div>
            </div>
            {/* Waiting */}
            <div className="bg-[#101412] p-5 rounded-xl border border-[#1D2A22] flex flex-col gap-1 hover:border-[#00FF66]/30 transition-all duration-300 shadow-md">
              <span className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Waiting</span>
              <span className="text-4xl font-black text-[#8A938D] tracking-tight">{statsLoading ? '…' : (stats.waiting ?? '--')}</span>
              <p className="text-[9px] text-[#8A938D]/60 mt-1 uppercase font-bold tracking-wider">In queue</p>
            </div>
            {/* Currently Interviewing */}
            <div className="bg-[#101412] p-5 rounded-xl border border-[#00FF66]/20 flex flex-col gap-1 hover:border-[#00FF66]/40 transition-all duration-300 shadow-md">
              <span className="text-[9px] font-black text-[#00FF66] uppercase tracking-widest">Interviewing</span>
              <span className="text-4xl font-black text-[#00FF66] tracking-tight">{statsLoading ? '…' : (stats.interviewing ?? '--')}</span>
              <p className="text-[9px] text-[#00FF66]/70 mt-1 uppercase font-bold tracking-wider animate-pulse">Live Rooms</p>
            </div>
            {/* Approved */}
            <div className="bg-[#101412] p-5 rounded-xl border border-[#1D2A22] flex flex-col gap-1 hover:border-[#00FF66]/30 transition-all duration-300 shadow-md">
              <span className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Approved</span>
              <span className="text-4xl font-black text-[#00FF66] tracking-tight">{statsLoading ? '…' : (stats.approved ?? '--')}</span>
              <p className="text-[9px] text-[#8A938D]/60 mt-1 uppercase font-bold tracking-wider">Completed</p>
            </div>
            {/* Pending */}
            <div className="bg-[#101412] p-5 rounded-xl border border-[#1D2A22] flex flex-col gap-1 hover:border-[#00FF66]/30 transition-all duration-300 shadow-md">
              <span className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Pending</span>
              <span className="text-4xl font-black text-[#FFB020] tracking-tight">{statsLoading ? '…' : (stats.pending ?? '--')}</span>
              <p className="text-[9px] text-[#8A938D]/60 mt-1 uppercase font-bold tracking-wider">Review</p>
            </div>
            {/* Attention */}
            <div className="bg-[#101412] p-5 rounded-xl border border-[#1D2A22] flex flex-col gap-1 hover:border-[#00FF66]/30 transition-all duration-300 shadow-md">
              <span className="text-[9px] font-black text-[#FF4D4D] uppercase tracking-widest">Attention</span>
              <span className="text-4xl font-black text-[#FF4D4D] tracking-tight">{statsLoading ? '…' : (stats.discussionNeeded ?? '--')}</span>
              <p className="text-[9px] text-[#8A938D]/60 mt-1 uppercase font-bold tracking-wider">Conflict</p>
            </div>
          </div>

          {/* Rooms Section (Full width row, displaying exactly 3 columns side-by-side on desktop) */}
          <div className="space-y-4">
            <div className="border-b border-[#1D2A22] pb-3">
              <h3 className="text-sm font-black text-[#F5F5F5] uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00FF66] text-lg font-bold">meeting_room</span>
                Interview Rooms Status
              </h3>
            </div>
            {roomsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-[#101412] p-6 rounded-xl flex flex-col gap-4 border border-[#1D2A22] animate-pulse">
                    <div className="h-5 bg-[#0B0D0C] rounded w-1/3"></div>
                    <div className="h-4 bg-[#0B0D0C] rounded w-2/3"></div>
                    <div className="h-4 bg-[#0B0D0C] rounded w-1/2"></div>
                    <div className="h-9 bg-[#0B0D0C] rounded mt-4"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {rooms.map((room) => (
                  <RoomCard key={room._id} room={room} />
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions & Recent Activity (Bottom Row) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Quick Actions (1/3 Width) */}
            <div className="bg-[#101412] p-6 rounded-xl border border-[#1D2A22] shadow-md h-full">
              <h3 className="text-[10px] font-black text-[#F5F5F5] uppercase tracking-widest border-b border-[#1D2A22] pb-3 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00FF66] text-base">bolt</span>
                Quick Actions
              </h3>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#0B0D0C] hover:bg-[#00FF66]/10 hover:text-[#00FF66] hover:border-[#00FF66]/40 border border-[#1D2A22] rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all text-[#F5F5F5] group/btn"
                >
                  <span>Sync Applicants</span>
                  <span className="material-symbols-outlined text-sm transition-transform group-hover/btn:rotate-180 duration-500">sync</span>
                </button>
                <Link
                  href="/admin/applicants"
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#0B0D0C] hover:bg-[#00FF66]/10 hover:text-[#00FF66] hover:border-[#00FF66]/40 border border-[#1D2A22] rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all text-[#F5F5F5]"
                >
                  <span>View All Applicants</span>
                  <span className="material-symbols-outlined text-sm">group</span>
                </Link>
                <Link
                  href="/admin/rooms"
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#0B0D0C] hover:bg-[#00FF66]/10 hover:text-[#00FF66] hover:border-[#00FF66]/40 border border-[#1D2A22] rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all text-[#F5F5F5]"
                >
                  <span>Rooms Status Overview</span>
                  <span className="material-symbols-outlined text-sm">terminal</span>
                </Link>
                <Link
                  href="/admin/results"
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#0B0D0C] hover:bg-[#00FF66]/10 hover:text-[#00FF66] hover:border-[#00FF66]/40 border border-[#1D2A22] rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all text-[#F5F5F5]"
                >
                  <span>Check Results</span>
                  <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
                </Link>
              </div>
            </div>

            {/* Recent Activity Empty State (2/3 Width) */}
            <div className="lg:col-span-2 bg-[#101412] p-6 rounded-xl border border-[#1D2A22] shadow-md h-full flex flex-col justify-between">
              <div>
                <h3 className="text-[10px] font-black text-[#F5F5F5] uppercase tracking-widest border-b border-[#1D2A22] pb-3 mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00FF66] text-base">event_note</span>
                  Recent Operations Log
                </h3>
              </div>
              <div className="py-12 flex flex-col items-center justify-center text-center gap-2.5 text-[#8A938D]">
                <div className="w-12 h-12 rounded-full bg-[#0B0D0C] border border-[#1D2A22] flex items-center justify-center text-[#8A938D]/40">
                  <span className="material-symbols-outlined text-2xl">receipt_long</span>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]/80">No recent activities logged</span>
                <span className="text-[10px] text-[#8A938D]/60 max-w-[280px] leading-relaxed">System events and real-time synchronization updates will populate here as operations are run.</span>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Global Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl flex items-start gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 border bg-[#101412] backdrop-blur-xl ${toast.type === 'success' ? 'border-[#00FF66]/50 text-[#00FF66]' : 'border-red-500/50 text-red-400'}`}>
          <span className="material-symbols-outlined mt-0.5">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <div className="text-xs font-semibold whitespace-pre-line text-[#F5F5F5]">{toast.message}</div>
          <button onClick={() => setToast(null)} className="text-[#8A938D] hover:text-[#F5F5F5] ml-4 transition-colors">
            <span className="material-symbols-outlined text-sm font-bold">close</span>
          </button>
        </div>
      )}

    </div>
  );
}
