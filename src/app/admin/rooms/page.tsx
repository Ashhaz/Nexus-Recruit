"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/ui/LogoutButton";
import CustomCursor from "@/components/ui/CustomCursor";

// ── Types ────────────────────────────────────────────────────────────────────

interface ApplicantResult {
  _id: string;
  name: string;
  rollNumber: string;
  department?: string;
  year?: string;
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

export default function AdminRoomsPage() {
  const pathname = usePathname();

  // ── Rooms state ───────────────────────────────────────────────────────────
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  
  // Ticker to force re-render for real-time elapsed time counter
  const [, setTimeTick] = useState(0);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms");
      const json = await res.json();
      if (json.success && json.rooms) {
        // Filter out any rooms beyond Room 3
        const activeRooms = json.rooms.filter((r: RoomData) => r.roomNumber <= 3);
        setRooms(activeRooms);
      }
    } catch {
      // silently keep previous state
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 15000); // Polling every 15s to monitor
    return () => clearInterval(interval);
  }, [fetchRooms]);

  // Real-time second tick for elapsed time displays
  useEffect(() => {
    const ticker = setInterval(() => {
      setTimeTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  // ── Room card ─────────────────────────────────────────────────────────────

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
        <div
          className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-[#00FF66]"
        >
          <span className="material-symbols-outlined text-8xl">meeting_room</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between z-10">
          <h4 className="text-sm font-bold text-[#F5F5F5] tracking-widest uppercase">
            ROOM {formattedRoomNumber}
          </h4>
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

        {/* Detail fields */}
        <div className="space-y-4 z-10 flex-grow">
          {isOccupied ? (
            <>
              <div className="p-4 bg-[#0B0D0C]/60 rounded-lg border border-[#1D2A22] flex flex-col gap-1.5">
                <p className="text-[9px] text-[#8A938D] font-black uppercase tracking-widest">
                  Interviewer
                </p>
                <p className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-[#8A938D]">person</span>
                  {room.interviewer || "—"}
                </p>
              </div>

              <div className="p-4 bg-[#0B0D0C]/60 rounded-lg border border-[#1D2A22] flex flex-col gap-1.5">
                <p className="text-[9px] text-[#8A938D] font-black uppercase tracking-widest">
                  Candidate
                </p>
                {room.applicant ? (
                  <div>
                    <p className="text-sm font-bold text-[#00FF66] flex items-center gap-2">
                      <span className="material-symbols-outlined text-xs text-[#00FF66]">school</span>
                      {room.applicant.name}
                    </p>
                    <p className="text-xs text-[#8A938D] font-mono mt-0.5 pl-5">
                      {room.applicant.rollNumber}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-[#8A938D] flex items-center gap-2">
                    <span className="material-symbols-outlined text-xs text-[#8A938D]">school</span>
                    —
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center px-2 pt-1">
                <span className="text-[9px] text-[#8A938D] font-black uppercase tracking-widest">
                  Elapsed Time
                </span>
                <span className="font-mono text-sm font-bold text-[#00FF66] animate-pulse">
                  {room.startedAt ? formatElapsed(room.startedAt) : "00:00"}
                </span>
              </div>
            </>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-2.5 border border-dashed border-[#1D2A22] rounded-lg bg-[#0B0D0C]/40 h-full min-h-[220px]">
              <span className="material-symbols-outlined text-2xl text-[#8A938D]/40">check_circle</span>
              <p className="text-xs font-bold text-[#8A938D] uppercase tracking-wider">Ready for Interview</p>
              <p className="text-[10px] text-[#8A938D]/60 max-w-[180px] leading-relaxed">Waiting for interviewer to join room</p>
            </div>
          )}
        </div>

        <Link
          href={`/interviewer/workspace?room=${room.roomNumber}`}
          className="mt-4 w-full py-2.5 bg-[#0B0D0C] hover:bg-[#00FF66] hover:text-[#050505] text-[#F5F5F5] rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors border border-[#1D2A22] z-10 flex items-center justify-center gap-2 group-hover:border-[#00FF66]/30 shadow-md"
        >
          <span className="material-symbols-outlined text-[14px]">visibility</span>
          Open Workspace
        </Link>
      </div>
    );
  };

  // ── Elapsed time helper ───────────────────────────────────────────────────

  function formatElapsed(startedAt: string): string {
    const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    if (diff < 0) return "00:00";
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60).toString().padStart(2, "0");
    const s = (diff % 60).toString().padStart(2, "0");
    return h > 0 
      ? `${h.toString().padStart(2, "0")}:${m}:${s}` 
      : `${m}:${s}`;
  }

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

      {/* Main Content Area */}
      <main className="md:ml-64 flex-1 min-h-screen flex flex-col relative">

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

        {/* Page Content */}
        <div className="flex-1 p-8 max-w-[1440px] mx-auto w-full space-y-8 overflow-x-hidden pt-8">

          <div>
            <h2 className="text-2xl font-black tracking-wide text-[#F5F5F5] uppercase">
              COMMAND &amp; CONTROL: ROOMS
            </h2>
            <p className="text-xs text-[#8A938D] mt-1 font-semibold uppercase tracking-wider">
              Monitor live interview sessions.
            </p>
          </div>

          {/* Room Grid */}
          {roomsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-[#101412] p-6 rounded-xl flex flex-col gap-4 border border-[#1D2A22] animate-pulse">
                  <div className="h-5 bg-[#0B0D0C] rounded w-1/3"></div>
                  <div className="h-16 bg-[#0B0D0C] rounded"></div>
                  <div className="h-16 bg-[#0B0D0C] rounded"></div>
                  <div className="h-10 bg-[#0B0D0C] rounded mt-4"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <RoomCard key={room._id} room={room} />
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
