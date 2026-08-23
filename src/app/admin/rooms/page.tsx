"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  interviewerId: string;
  applicant: ApplicantResult | null;
  status: "Available" | "Occupied";
  startedAt: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminRoomsPage() {
  const pathname = usePathname();
  const router = useRouter();

  // ── Rooms state ───────────────────────────────────────────────────────────
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);

  // ── Identities & Registration state ────────────────────────────────────────
  const [identities, setIdentities] = useState<{ id: string; name: string }[]>([]);
  const [selectedIdentities, setSelectedIdentities] = useState<Record<number, string>>({});
  const [registeringRoom, setRegisteringRoom] = useState<number | null>(null);

  // ── Toast Notifications state ──────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const fetchRooms = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setRoomsLoading(true);
    }
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
      if (!isBackground) {
        setRoomsLoading(false);
      }
    }
  }, []);

  const fetchIdentities = useCallback(async () => {
    try {
      const res = await fetch("/api/interviewer/identities");
      const json = await res.json();
      if (json.success && json.identities) {
        setIdentities(json.identities);
      }
    } catch (e) {
      console.error("Error fetching interviewer identities:", e);
    }
  }, []);

  useEffect(() => {
    fetchRooms(false);
    fetchIdentities();
    const interval = setInterval(() => fetchRooms(true), 10000); // Polling every 10s to monitor/sync
    return () => clearInterval(interval);
  }, [fetchRooms, fetchIdentities]);

  const handleEnterRoom = async (roomNumber: number) => {
    const interviewerName = selectedIdentities[roomNumber];
    if (!interviewerName) {
      showToast("Please select an interviewer identity first.", "error");
      return;
    }

    setRegisteringRoom(roomNumber);
    try {
      const res = await fetch("/api/interviewer/workspace/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber,
          interviewerName,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to register room");
      }
      localStorage.setItem(`nexus_admin_conducting_${roomNumber}`, "true");
      router.push(`/interviewer/workspace/select?room=${roomNumber}`);
    } catch (e: any) {
      showToast(e.message || "An error occurred", "error");
    } finally {
      setRegisteringRoom(null);
    }
  };

  // ── Room card ─────────────────────────────────────────────────────────────

  const RoomCard = ({ room }: { room: RoomData }) => {
    const hasActiveInterview = room.status === "Occupied" && room.applicant !== null;
    const isRegistered = room.interviewer !== "" && room.interviewer !== undefined && room.interviewer !== null;
    const formattedRoomNumber = String(room.roomNumber).padStart(2, "0");
    const [elapsed, setElapsed] = useState(0);

    // Live ticking timer for occupied rooms
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
        className={`bg-[#101412] p-6 rounded-xl flex flex-col gap-5 border transition-all duration-300 shadow-xl relative overflow-hidden group ${
          hasActiveInterview
            ? "border-[#00FF66]/30 shadow-[0_0_15px_rgba(0,255,102,0.05)]"
            : "border-[#1D2A22]"
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
              hasActiveInterview
                ? "bg-[#00FF66]/10 text-[#00FF66]"
                : "bg-[#8A938D]/10 text-[#8A938D]"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${hasActiveInterview ? "bg-[#00FF66] animate-pulse" : "bg-[#8A938D]"}`}></span>
            {hasActiveInterview ? "LIVE" : "AVAILABLE"}
          </span>
        </div>

        {/* Detail fields */}
        <div className="space-y-4 z-10 flex-grow">
          {hasActiveInterview ? (
            <>
              {/* Interviewer */}
              <div className="p-4 bg-[#0B0D0C]/60 rounded-lg border border-[#1D2A22] flex flex-col gap-1.5">
                <p className="text-[9px] text-[#8A938D] font-black uppercase tracking-widest">
                  Interviewer
                </p>
                <p className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-[#8A938D]">person</span>
                  {room.interviewer || "—"}
                </p>
              </div>

              {/* Candidate */}
              <div className="p-4 bg-[#0B0D0C]/60 rounded-lg border border-[#1D2A22] flex flex-col gap-1.5">
                <p className="text-[9px] text-[#8A938D] font-black uppercase tracking-widest">
                  Candidate
                </p>
                <div>
                  <p className="text-sm font-bold text-[#00FF66] flex items-center gap-2">
                    <span className="material-symbols-outlined text-xs text-[#00FF66]">school</span>
                    {room.applicant?.name}
                  </p>
                  <p className="text-xs text-[#8A938D] font-mono mt-0.5 pl-5">
                    {room.applicant?.rollNumber}
                  </p>
                </div>
              </div>
              {/* Duration display */}
              <div className="flex justify-between items-center px-2 pt-1">
                <span className="text-[9px] text-[#8A938D] font-black uppercase tracking-widest">
                  Interview Duration
                </span>
                <span className="font-mono text-sm font-bold text-[#00FF66]">
                  {formatTime(elapsed)}
                </span>
              </div>
            </>
          ) : isRegistered ? (
            <>
              {/* Registered but no active candidate */}
              <div className="p-4 bg-[#0B0D0C]/60 rounded-lg border border-[#1D2A22] flex flex-col gap-1.5">
                <p className="text-[9px] text-[#8A938D] font-black uppercase tracking-widest">
                  Interviewer
                </p>
                <p className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-[#8A938D]">person</span>
                  {room.interviewer}
                </p>
              </div>

              <div className="p-4 bg-[#0B0D0C]/40 border border-dashed border-[#1D2A22] rounded-lg text-center py-6">
                <p className="text-xs font-bold text-[#8A938D] uppercase tracking-wider">No Active Interview</p>
              </div>
            </>
          ) : (
            <>
              {/* Available Room */}
              <div className="space-y-4">
                <div className="p-4 bg-[#0B0D0C]/40 border border-dashed border-[#1D2A22] rounded-lg text-center py-6">
                  <p className="text-xs font-bold text-[#8A938D] uppercase tracking-wider">No Active Interview</p>
                </div>

                {/* Identity dropdown selection */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-[#8A938D] font-black uppercase tracking-widest block">
                    Select Physical Identity
                  </label>
                  <select
                    value={selectedIdentities[room.roomNumber] || ""}
                    onChange={(e) =>
                      setSelectedIdentities({
                        ...selectedIdentities,
                        [room.roomNumber]: e.target.value,
                      })
                    }
                    className="w-full bg-[#050505] border border-[#1D2A22] rounded-lg px-2.5 py-1.5 text-[11px] text-[#F5F5F5] focus:outline-none focus:border-[#00FF66] transition-colors font-bold uppercase tracking-wider"
                  >
                    <option value="" disabled>-- Choose Interviewer --</option>
                    {identities.map((id) => (
                      <option key={id.id} value={id.name}>{id.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Buttons */}
        <div className="mt-2 z-10">
          {hasActiveInterview ? (
            <Link
              href={`/interviewer/workspace/active?room=${room.roomNumber}`}
              className="w-full py-2.5 bg-[#0B0D0C] hover:bg-[#00FF66] hover:text-[#050505] text-[#F5F5F5] rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors border border-[#1D2A22] flex items-center justify-center gap-2 group-hover:border-[#00FF66]/30 shadow-md"
            >
              <span className="material-symbols-outlined text-[13px]">visibility</span>
              View Interview
            </Link>
          ) : isRegistered ? (
            <button
              onClick={() => {
                localStorage.setItem(`nexus_admin_conducting_${room.roomNumber}`, "true");
                router.push(`/interviewer/workspace/select?room=${room.roomNumber}`);
              }}
              className="w-full py-2.5 bg-[#00FF66] hover:bg-[#00E55C] text-[#050505] rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors border border-[#00FF66]/20 flex items-center justify-center gap-1.5 shadow-md"
            >
              <span className="material-symbols-outlined text-[13px]">login</span>
              Enter Workspace
            </button>
          ) : (
            <button
              onClick={() => handleEnterRoom(room.roomNumber)}
              disabled={registeringRoom === room.roomNumber}
              className="w-full py-2.5 bg-[#00FF66] hover:bg-[#00E55C] text-[#050505] rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors border border-[#00FF66]/20 flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[13px]">login</span>
              {registeringRoom === room.roomNumber ? "Entering..." : "Enter Room"}
            </button>
          )}
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
              Monitor and manage live interview sessions.
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

      {/* Toast Notification element */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg border text-xs font-bold shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 ${
          toast.type === "success" 
            ? "bg-[#0B0D0C] border-[#00FF66] text-[#00FF66]" 
            : "bg-[#0B0D0C] border-[#FF007A] text-[#FF007A]"
        }`}>
          <span className="material-symbols-outlined text-base">
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          <span className="whitespace-pre-line">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
