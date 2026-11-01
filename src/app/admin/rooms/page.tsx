"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LogoutButton from "@/components/ui/LogoutButton";
import CustomCursor from "@/components/ui/CustomCursor";
import AdminSidebar from "@/components/admin/AdminSidebar";
import EventWorkspaceBanner from "@/components/admin/EventWorkspaceBanner";

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
  name?: string;
  interviewer: string;
  interviewerId: string;
  assignedInterviewer?: string;
  applicant: ApplicantResult | null;
  status: "Available" | "Occupied";
  isActive?: boolean;
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
    const room = rooms.find((r) => r.roomNumber === roomNumber);
    if (room && room.isActive === false) {
      showToast("Cannot enter a deactivated room.", "error");
      return;
    }

    const interviewerName = selectedIdentities[roomNumber] || room?.assignedInterviewer;
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
    const isDeactivated = room.isActive === false;
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
          isDeactivated
            ? "border-[#1D2A22]/50 opacity-70"
            : hasActiveInterview
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
          <h4 className="text-sm font-bold text-[#F5F5F5] tracking-widest uppercase truncate max-w-[170px]">
            {room.name ? room.name.toUpperCase() : `ROOM ${formattedRoomNumber}`}
          </h4>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isDeactivated
                ? "bg-[#FF4D4D]/10 text-[#FF4D4D]"
                : hasActiveInterview
                ? "bg-[#00FF66]/10 text-[#00FF66]"
                : "bg-[#8A938D]/10 text-[#8A938D]"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isDeactivated
                  ? "bg-[#FF4D4D]"
                  : hasActiveInterview
                  ? "bg-[#00FF66] animate-pulse"
                  : "bg-[#8A938D]"
              }`}
            ></span>
            {isDeactivated ? "DEACTIVATED" : hasActiveInterview ? "LIVE" : "AVAILABLE"}
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
                  {room.interviewer || room.assignedInterviewer || "—"}
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
                  {room.interviewer || room.assignedInterviewer || "—"}
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
                  <p className="text-xs font-bold text-[#8A938D] uppercase tracking-wider">
                    {isDeactivated ? "Room Deactivated" : "No Active Interview"}
                  </p>
                  {room.assignedInterviewer && (
                    <p className="text-[10px] text-[#8A938D]/70 font-semibold uppercase tracking-wider mt-1">
                      Assigned: {room.assignedInterviewer}
                    </p>
                  )}
                </div>

                {/* Identity dropdown selection */}
                {!isDeactivated && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-[#8A938D] font-black uppercase tracking-widest block">
                      Select Physical Identity
                    </label>
                    <select
                      value={selectedIdentities[room.roomNumber] || room.assignedInterviewer || ""}
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
                )}
              </div>
            </>
          )}
        </div>

        {/* Buttons */}
        <div className="mt-2 z-10">
          {isDeactivated ? (
            <button
              disabled
              className="w-full py-2.5 bg-[#0B0D0C] text-[#8A938D] rounded-lg text-[10px] font-bold uppercase tracking-wider border border-[#1D2A22] flex items-center justify-center gap-1.5 opacity-60 cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[13px]">block</span>
              Room Deactivated
            </button>
          ) : hasActiveInterview ? (
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
      <AdminSidebar />

      {/* Main Content Area */}
      <main className="md:ml-64 flex-1 min-h-screen flex flex-col relative">

        {/* Page Content */}
        <div className="flex-1 p-8 max-w-[1440px] mx-auto w-full space-y-8 overflow-x-hidden pt-8">
          <EventWorkspaceBanner />

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
              {[1, 2, 3, 4].map((n) => (
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
