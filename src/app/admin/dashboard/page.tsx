"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LogoutButton from "@/components/ui/LogoutButton";
import CustomCursor from "@/components/ui/CustomCursor";

// ── Types ────────────────────────────────────────────────────────────────────

interface ApplicantData {
  _id: string;
  name: string;
  rollNumber: string;
  department?: string;
  branch?: string;
  year?: string;
  email?: string;
  phone?: string;
  interviewStatus: "Waiting" | "Interviewing" | "Approved" | "Pending" | "Discussion Needed";
  assignedRoom?: number | null;
  assignedInterviewer?: string;
  interviewDuration?: number;
  finalDecision?: string;
  interviewNotes?: string;
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0)
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const pathname = usePathname();
  const router = useRouter();
  const detailsRef = useRef<HTMLDivElement>(null);

  // ── Sync & Notifications ──────────────────────────────────────────────────
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ── State ─────────────────────────────────────────────────────────────────
  const [applicants, setApplicants] = useState<ApplicantData[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(true);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);



  // ── Interactive Controls ──────────────────────────────────────────────────
  const [activeCard, setActiveCard] = useState<"total" | "waiting" | "interviewing" | "approved" | "pending" | "discussion" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  };

  const fetchApplicants = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setApplicantsLoading(true);
    }
    try {
      const res = await fetch("/api/dashboard/applicants");
      const json = await res.json();
      if (json.success && json.applicants) {
        setApplicants(json.applicants);
        const now = new Date();
        setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (e) {
      console.error("Error fetching dashboard applicants:", e);
    } finally {
      if (!isBackground) {
        setApplicantsLoading(false);
      }
    }
  }, []);

  const fetchRooms = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setRoomsLoading(true);
    }
    try {
      const res = await fetch("/api/rooms");
      const json = await res.json();
      if (json.success && json.rooms) {
        setRooms(json.rooms);
      }
    } catch {
      // silently keep previous state
    } finally {
      if (!isBackground) {
        setRoomsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchApplicants(false);
    fetchRooms(false);
    const interval = setInterval(() => {
      fetchApplicants(true);
      fetchRooms(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchApplicants, fetchRooms]);

  // Scroll to bottom expanded list automatically when state changes to an active card
  useEffect(() => {
    if (activeCard) {
      setTimeout(() => {
        detailsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [activeCard]);

  // ── Sync handler ──────────────────────────────────────────────────────────

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/applicants/sync", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync applicants");
      }

      showToast(
        `Sync Complete!\nImported: ${data.imported}\nUpdated: ${data.updated}\nFailed: ${data.skipped}`,
        "success"
      );
      fetchApplicants(false);
      fetchRooms(false);
    } catch (error: any) {
      showToast(error.message || "An unexpected error occurred", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Needs Attention Click handler ──────────────────────────────────────────

  const handleNeedsAttentionClick = (card: "pending" | "discussion" | "waiting") => {
    setActiveCard(card);
  };

  // ── Admin Enter Available Room Logic ───────────────────────────────────────



  // ── Single Source of Truth Calculations ────────────────────────────────────

  const totalCount = applicants.length;
  const waitingCount = applicants.filter((a) => a.interviewStatus === "Waiting").length;
  const interviewingCount = applicants.filter((a) => a.interviewStatus === "Interviewing").length;
  const approvedCount = applicants.filter((a) => a.interviewStatus === "Approved").length;
  const pendingCount = applicants.filter((a) => a.interviewStatus === "Pending").length;
  const discussionCount = applicants.filter((a) => a.interviewStatus === "Discussion Needed").length;

  // Filtered applicants for expanded view card
  const filteredApplicantsByCard = (() => {
    let list: ApplicantData[] = [];
    switch (activeCard) {
      case "total":
        list = applicants;
        break;
      case "waiting":
        list = applicants.filter((a) => a.interviewStatus === "Waiting");
        break;
      case "interviewing":
        list = applicants.filter((a) => a.interviewStatus === "Interviewing");
        break;
      case "approved":
        list = applicants.filter((a) => a.interviewStatus === "Approved");
        break;
      case "pending":
        list = applicants.filter((a) => a.interviewStatus === "Pending");
        break;
      case "discussion":
        list = applicants.filter((a) => a.interviewStatus === "Discussion Needed");
        break;
      default:
        return [];
    }

    if (activeCard === "total" && searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      return list.filter(
        (a) => a.name.toLowerCase().includes(q) || a.rollNumber.toLowerCase().includes(q)
      );
    }

    return list;
  })();

  // ── Room card helper ──────────────────────────────────────────────────────

  const RoomCard = ({ room }: { room: RoomData }) => {
    const hasActiveInterview = room.status === "Occupied" && room.applicant !== null;
    const isRegistered = room.interviewer !== "" && room.interviewer !== undefined && room.interviewer !== null;
    const formattedRoomNumber = String(room.roomNumber).padStart(2, "0");
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
      if (!hasActiveInterview || !room.startedAt) return;
      const updateElapsed = () => {
        const ms = Date.now() - new Date(room.startedAt!).getTime();
        setElapsed(Math.max(0, Math.floor(ms / 1000)));
      };
      updateElapsed();
      const interval = setInterval(updateElapsed, 1000);
      return () => clearInterval(interval);
    }, [hasActiveInterview, room.startedAt]);

    function formatTime(totalSeconds: number): string {
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      if (h > 0)
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    return (
      <div 
        className={`bg-[#101412] p-6 rounded-xl flex flex-col gap-4 border transition-all duration-300 shadow-xl relative overflow-hidden ${
          hasActiveInterview 
            ? "border-[#00FF66]/30 shadow-[0_0_15px_rgba(0,255,102,0.05)]" 
            : "border-[#1D2A22]"
        }`}
      >
        <div className="absolute top-0 right-0 p-4 opacity-5 text-[#00FF66]">
          <span className="material-symbols-outlined text-6xl">meeting_room</span>
        </div>
        
        <div className="flex items-center justify-between z-10">
          <h4 className="text-sm font-bold text-[#F5F5F5] tracking-widest uppercase">ROOM {formattedRoomNumber}</h4>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              hasActiveInterview
                ? "bg-[#00FF66]/10 text-[#00FF66]"
                : isRegistered
                ? "bg-[#00FF66]/5 text-[#8A938D]"
                : "bg-[#8A938D]/10 text-[#8A938D]"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${hasActiveInterview ? "bg-[#00FF66] animate-pulse" : "bg-[#8A938D]"}`}></span>
            {hasActiveInterview ? "LIVE" : isRegistered ? "REGISTERED" : "AVAILABLE"}
          </span>
        </div>

        <div className="z-10 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 text-xs border-t border-[#1D2A22]/50 pt-3">
            <div>
              <p className="text-[9px] text-[#8A938D] font-black uppercase tracking-wider">STATUS</p>
              <p className="font-bold text-[#F5F5F5] uppercase">
                {hasActiveInterview ? "LIVE" : isRegistered ? "REGISTERED" : "AVAILABLE"}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-[#8A938D] font-black uppercase tracking-wider">INTERVIEWER</p>
              <p className="font-bold text-[#F5F5F5] truncate">
                {isRegistered ? (room.interviewer || "—") : "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs border-t border-[#1D2A22]/30 pt-3">
            <div>
              <p className="text-[9px] text-[#8A938D] font-black uppercase tracking-wider">CANDIDATE</p>
              <p className={`font-bold ${hasActiveInterview ? "text-[#00FF66]" : "text-[#F5F5F5]/40"}`}>
                {hasActiveInterview ? (room.applicant?.name || "—") : "—"}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-[#8A938D] font-black uppercase tracking-wider">ROLL NUMBER</p>
              <p className={`font-bold font-mono ${hasActiveInterview ? "text-[#F5F5F5]" : "text-[#F5F5F5]/40"}`}>
                {hasActiveInterview ? (room.applicant?.rollNumber || "—") : "—"}
              </p>
            </div>
          </div>

          <div className="border-t border-[#1D2A22]/30 pt-3 text-xs">
            <p className="text-[9px] text-[#8A938D] font-black uppercase tracking-wider">
              {hasActiveInterview ? "INTERVIEW DURATION" : "ACTIVE INTERVIEW"}
            </p>
            <p className={`font-bold ${hasActiveInterview ? "font-mono text-[#00FF66] text-sm" : "text-[#8A938D]"}`}>
              {hasActiveInterview ? formatTime(elapsed) : "No Active Interview"}
            </p>
          </div>
        </div>
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
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-2xl font-black tracking-wide text-[#F5F5F5] uppercase">System Dashboard</h2>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#00FF66]/10 text-[#00FF66] text-[8px] font-bold tracking-widest uppercase animate-pulse">
                  <span className="w-1 h-1 rounded-full bg-[#00FF66]"></span>
                  Live
                </span>
                {lastUpdated && (
                  <span className="text-[9px] text-[#8A938D]/60 font-mono tracking-wider">
                    UPDATED: {lastUpdated}
                  </span>
                )}
              </div>
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

          {/* 1. RECRUITMENT OVERVIEW */}
          <div className="space-y-4">
            <div className="border-b border-[#1D2A22] pb-3">
              <h3 className="text-sm font-black text-[#F5F5F5] uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00FF66] text-lg font-bold">analytics</span>
                Recruitment Overview
              </h3>
            </div>

            {/* Metric Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Total Applications */}
              <div 
                onClick={() => setActiveCard(activeCard === "total" ? null : "total")}
                className={`p-5 rounded-xl border flex flex-col gap-1 transition-all duration-300 shadow-md cursor-pointer bg-[#101412] ${
                  activeCard === "total" ? "border-[#00FF66] shadow-[0_0_15px_rgba(0,255,102,0.1)]" : "border-[#1D2A22] hover:border-[#00FF66]/30"
                }`}
              >
                <span className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Total Applications</span>
                <span className="text-4xl font-black text-[#F5F5F5] tracking-tight">{applicantsLoading ? '…' : totalCount}</span>
                <p className="text-[9px] text-[#8A938D]/60 mt-1 uppercase font-bold tracking-wider">All Candidates</p>
              </div>
              {/* Waiting */}
              <div 
                onClick={() => setActiveCard(activeCard === "waiting" ? null : "waiting")}
                className={`p-5 rounded-xl border flex flex-col gap-1 transition-all duration-300 shadow-md cursor-pointer bg-[#101412] ${
                  activeCard === "waiting" ? "border-[#00FF66] shadow-[0_0_15px_rgba(0,255,102,0.1)]" : "border-[#1D2A22] hover:border-[#00FF66]/30"
                }`}
              >
                <span className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Waiting</span>
                <span className="text-4xl font-black text-[#8A938D] tracking-tight">{applicantsLoading ? '…' : waitingCount}</span>
                <p className="text-[9px] text-[#8A938D]/60 mt-1 uppercase font-bold tracking-wider">In Queue</p>
              </div>
              {/* Currently Interviewing */}
              <div 
                onClick={() => setActiveCard(activeCard === "interviewing" ? null : "interviewing")}
                className={`p-5 rounded-xl border flex flex-col gap-1 transition-all duration-300 shadow-md cursor-pointer bg-[#101412] ${
                  activeCard === "interviewing" ? "border-[#00FF66] shadow-[0_0_15px_rgba(0,255,102,0.15)]" : "border-[#00FF66]/20 hover:border-[#00FF66]/40"
                }`}
              >
                <span className="text-[9px] font-black text-[#00FF66] uppercase tracking-widest">Interviewing</span>
                <span className="text-4xl font-black text-[#00FF66] tracking-tight">{applicantsLoading ? '…' : interviewingCount}</span>
                <p className="text-[9px] text-[#00FF66]/70 mt-1 uppercase font-bold tracking-wider animate-pulse">Live Interviews</p>
              </div>
              {/* Approved */}
              <div 
                onClick={() => setActiveCard(activeCard === "approved" ? null : "approved")}
                className={`p-5 rounded-xl border flex flex-col gap-1 transition-all duration-300 shadow-md cursor-pointer bg-[#101412] ${
                  activeCard === "approved" ? "border-[#00FF66] shadow-[0_0_15px_rgba(0,255,102,0.1)]" : "border-[#1D2A22] hover:border-[#00FF66]/30"
                }`}
              >
                <span className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Approved</span>
                <span className="text-4xl font-black text-[#00FF66] tracking-tight">{applicantsLoading ? '…' : approvedCount}</span>
                <p className="text-[9px] text-[#8A938D]/60 mt-1 uppercase font-bold tracking-wider">Completed</p>
              </div>
              {/* Pending */}
              <div 
                onClick={() => setActiveCard(activeCard === "pending" ? null : "pending")}
                className={`p-5 rounded-xl border flex flex-col gap-1 transition-all duration-300 shadow-md cursor-pointer bg-[#101412] ${
                  activeCard === "pending" ? "border-[#00FF66] shadow-[0_0_15px_rgba(0,255,102,0.1)]" : "border-[#1D2A22] hover:border-[#00FF66]/30"
                }`}
              >
                <span className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Pending</span>
                <span className="text-4xl font-black text-[#FFB020] tracking-tight">{applicantsLoading ? '…' : pendingCount}</span>
                <p className="text-[9px] text-[#8A938D]/60 mt-1 uppercase font-bold tracking-wider">Review Required</p>
              </div>
              {/* Discussion Needed */}
              <div 
                onClick={() => setActiveCard(activeCard === "discussion" ? null : "discussion")}
                className={`p-5 rounded-xl border flex flex-col gap-1 transition-all duration-300 shadow-md cursor-pointer bg-[#101412] ${
                  activeCard === "discussion" ? "border-[#FF4D4D] shadow-[0_0_15px_rgba(255,77,77,0.1)]" : "border-[#1D2A22] hover:border-[#FF4D4D]/30"
                }`}
              >
                <span className="text-[9px] font-black text-[#FF4D4D] uppercase tracking-widest">Discussion Needed</span>
                <span className="text-4xl font-black text-[#FF4D4D] tracking-tight">{applicantsLoading ? '…' : discussionCount}</span>
                <p className="text-[9px] text-[#8A938D]/60 mt-1 uppercase font-bold tracking-wider">Requires Discussion</p>
              </div>
            </div>
          </div>

          {/* 2. INTERVIEW ROOMS STATUS */}
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

          {/* 3. NEEDS ATTENTION & 4. RECRUITMENT BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Needs Attention (1/3 Width) */}
            <div className="bg-[#101412] p-6 rounded-xl border border-[#1D2A22] shadow-md h-full space-y-4">
              <h3 className="text-[10px] font-black text-[#F5F5F5] uppercase tracking-widest border-b border-[#1D2A22] pb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#FF4D4D] text-base">warning</span>
                Needs Attention
              </h3>
              <div className="flex flex-col gap-2.5 pt-2">
                {pendingCount > 0 && (
                  <button
                    onClick={() => handleNeedsAttentionClick("pending")}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#0B0D0C] hover:bg-[#FFB020]/10 hover:text-[#FFB020] hover:border-[#FFB020]/40 border border-[#1D2A22] rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all text-[#F5F5F5]"
                  >
                    <span>{pendingCount} Pending Decisions</span>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                )}
                {discussionCount > 0 && (
                  <button
                    onClick={() => handleNeedsAttentionClick("discussion")}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#0B0D0C] hover:bg-[#FF4D4D]/10 hover:text-[#FF4D4D] hover:border-[#FF4D4D]/40 border border-[#FF4D4D]/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all text-[#FF4D4D] animate-pulse"
                  >
                    <span>{discussionCount} Discussion Needed</span>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                )}
                {waitingCount > 0 && (
                  <button
                    onClick={() => handleNeedsAttentionClick("waiting")}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#0B0D0C] hover:bg-[#00FF66]/10 hover:text-[#00FF66] hover:border-[#00FF66]/40 border border-[#1D2A22] rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all text-[#F5F5F5]"
                  >
                    <span>{waitingCount} Candidates Waiting</span>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                )}
                {pendingCount === 0 && discussionCount === 0 && waitingCount === 0 && (
                  <p className="text-xs text-[#8A938D] font-semibold py-6 text-center uppercase tracking-wider">
                    All clear. No items require attention.
                  </p>
                )}
              </div>
            </div>

            {/* Recruitment Breakdown (2/3 Width) */}
            <div className="lg:col-span-2 bg-[#101412] p-6 rounded-xl border border-[#1D2A22] shadow-md h-full space-y-6">
              <h3 className="text-[10px] font-black text-[#F5F5F5] uppercase tracking-widest border-b border-[#1D2A22] pb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00FF66] text-base">bar_chart</span>
                Recruitment Breakdown
              </h3>
              
              <div className="space-y-4 pt-2">
                {[
                  { label: "Waiting Queue", count: waitingCount, color: "bg-[#8A938D]", pct: totalCount > 0 ? (waitingCount / totalCount) * 100 : 0 },
                  { label: "Live Interviews", count: interviewingCount, color: "bg-[#00FF66]", pct: totalCount > 0 ? (interviewingCount / totalCount) * 100 : 0 },
                  { label: "Approved Candidates", count: approvedCount, color: "bg-[#00FF66] shadow-[0_0_8px_rgba(0,255,102,0.4)]", pct: totalCount > 0 ? (approvedCount / totalCount) * 100 : 0 },
                  { label: "Pending Review", count: pendingCount, color: "bg-[#FFB020]", pct: totalCount > 0 ? (pendingCount / totalCount) * 100 : 0 },
                  { label: "Discussion Needed", count: discussionCount, color: "bg-[#FF4D4D]", pct: totalCount > 0 ? (discussionCount / totalCount) * 100 : 0 }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8A938D] font-bold uppercase tracking-wider">{item.label}</span>
                      <span className="text-[#F5F5F5] font-black">
                        {item.count} <span className="text-[10px] text-[#8A938D]/60 font-semibold">({totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#0B0D0C] rounded-full overflow-hidden border border-[#1D2A22]/30">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                        style={{ width: `${item.pct}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 5. EXPANDED STATUS DETAILS (Appears at the very bottom, in normal flow, position: static) */}
          {activeCard && (
            <div ref={detailsRef} className="space-y-4 pt-8 border-t border-[#1D2A22] animate-in fade-in duration-300">
              <div className="bg-[#101412] border border-[#1D2A22] rounded-xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#1D2A22] pb-3">
                  <h3 className="text-sm font-black text-[#F5F5F5] uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00FF66]">
                      {activeCard === "total" && "analytics"}
                      {activeCard === "waiting" && "hourglass_empty"}
                      {activeCard === "interviewing" && "radio_button_checked"}
                      {activeCard === "approved" && "check_circle"}
                      {activeCard === "pending" && "pending_actions"}
                      {activeCard === "discussion" && "report"}
                    </span>
                    {activeCard === "total" && `Total Applications · ${filteredApplicantsByCard.length}`}
                    {activeCard === "waiting" && `Waiting Queue · ${filteredApplicantsByCard.length}`}
                    {activeCard === "interviewing" && `Live Interviews · ${filteredApplicantsByCard.length}`}
                    {activeCard === "approved" && `Approved Candidates · ${filteredApplicantsByCard.length}`}
                    {activeCard === "pending" && `Pending Review · ${filteredApplicantsByCard.length}`}
                    {activeCard === "discussion" && `Discussion Needed · ${filteredApplicantsByCard.length}`}
                  </h3>
                  <button
                    onClick={() => setActiveCard(null)}
                    className="p-1 rounded-full text-[#8A938D] hover:text-[#FF4D4D] hover:bg-[#FF4D4D]/10 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm font-bold">close</span>
                  </button>
                </div>

                {activeCard === "total" && (
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search by name or roll number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full max-w-md bg-[#0B0D0C] border border-[#1D2A22] rounded-lg px-4 py-2.5 text-xs text-[#F5F5F5] placeholder:text-[#8A938D]/40 focus:outline-none focus:border-[#00FF66] transition-colors"
                    />
                  </div>
                )}

                <div className="max-h-96 overflow-y-auto custom-scrollbar divide-y divide-[#1D2A22] pr-2">
                  {filteredApplicantsByCard.length === 0 ? (
                    <p className="text-xs text-[#8A938D] font-semibold py-8 text-center uppercase tracking-wider">
                      No candidates in this list.
                    </p>
                  ) : (
                    filteredApplicantsByCard.map((app) => {
                      const branchDetails = [app.branch || app.department, app.year ? `${app.year} Yr` : ""].filter(Boolean).join(" · ");
                      return (
                        <div
                          key={app._id}
                          className={`py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0 ${
                            activeCard === "discussion" ? "bg-[#1D1111] px-4 rounded-lg my-1 border border-[#FF4D4D]/25" : ""
                          }`}
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-black text-[#F5F5F5] uppercase tracking-wide">
                              {app.name}
                            </p>
                            <p className="text-xs font-mono text-[#8A938D]">
                              {app.rollNumber}
                              {activeCard === "waiting" && branchDetails ? ` · ${branchDetails}` : ""}
                            </p>
                          </div>

                          <div className="text-right text-xs">
                            {activeCard === "total" && (
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                app.interviewStatus === "Approved" ? "bg-[#00FF66]/10 text-[#00FF66]" :
                                app.interviewStatus === "Pending" ? "bg-[#FFB020]/10 text-[#FFB020]" :
                                app.interviewStatus === "Discussion Needed" ? "bg-[#FF4D4D]/10 text-[#FF4D4D]" :
                                app.interviewStatus === "Interviewing" ? "bg-[#00FF66]/20 text-[#00FF66] animate-pulse" :
                                "bg-[#8A938D]/10 text-[#8A938D]"
                              }`}>
                                {app.interviewStatus}
                              </span>
                            )}
                            {activeCard === "waiting" && null}
                            {activeCard === "interviewing" && (
                              <div className="space-y-0.5">
                                <p className="text-[#00FF66] font-bold uppercase tracking-wider">
                                  Room {app.assignedRoom ? String(app.assignedRoom).padStart(2, "0") : "—"}
                                </p>
                                <p className="text-[#8A938D] font-medium">
                                  Interviewer: {app.assignedInterviewer || "—"} {app.interviewDuration ? `· ${formatTime(app.interviewDuration)}` : ""}
                                </p>
                              </div>
                            )}
                            {activeCard === "approved" && (
                              <p className="text-[#8A938D] font-medium">
                                Interviewer: {app.assignedInterviewer || "—"}
                              </p>
                            )}
                            {activeCard === "pending" && (
                              <div className="space-y-0.5">
                                <p className="text-[#FFB020] font-bold uppercase tracking-wider">
                                  Pending Evaluation
                                </p>
                                <p className="text-[#8A938D] font-medium">
                                  Interviewer: {app.assignedInterviewer || "—"}
                                </p>
                              </div>
                            )}
                            {activeCard === "discussion" && (
                              <div className="space-y-0.5">
                                <p className="text-[#FF4D4D] font-bold uppercase tracking-wider animate-pulse">
                                  Discussion Needed
                                </p>
                                <p className="text-[#8A938D] font-medium">
                                  Interviewer: {app.assignedInterviewer || "—"}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Global Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl flex items-start gap-3 shadow-2xl border bg-[#101412] backdrop-blur-xl ${toast.type === 'success' ? 'border-[#00FF66]/50 text-[#00FF66]' : 'border-red-500/50 text-red-400'}`}>
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
