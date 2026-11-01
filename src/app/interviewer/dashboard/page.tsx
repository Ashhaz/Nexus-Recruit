"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import CustomCursor from "@/components/ui/CustomCursor";

interface RoomData {
  _id: string;
  roomNumber: number;
  name?: string;
  interviewer?: string;
  assignedInterviewer?: string;
  status: string;
  isActive?: boolean;
}

export default function InterviewerDashboardPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [activeEvent, setActiveEvent] = useState<{ _id: string; name: string } | null>(null);
  const [eventStats, setEventStats] = useState<{ totalCandidates: number; waitingCandidates: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Registration and room selection states
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [interviewerName, setInterviewerName] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch("/api/rooms");
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Failed to load rooms");
        setRooms(json.rooms);
      } catch (e: any) {
        setError(e.message || "Network error");
      } finally {
        setLoading(false);
      }
    };

    const fetchActiveEvent = async () => {
      try {
        const res = await fetch("/api/active-event");
        const json = await res.json();
        if (json.success && json.event) {
          setActiveEvent(json.event);
          if (json.stats) setEventStats(json.stats);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchRooms();
    fetchActiveEvent();
  }, []);

  const handleSelectRoom = (roomNumber: number) => {
    const room = rooms.find((r) => r.roomNumber === roomNumber);
    setSelectedRoom(roomNumber);
    setRegisterError("");
    setInterviewerName(room?.assignedInterviewer || "");
  };

  const handleRegister = async () => {
    if (!selectedRoom) return;
    const trimmedName = interviewerName.trim();
    if (!trimmedName) {
      setRegisterError("Please enter your name.");
      return;
    }

    setRegistering(true);
    setRegisterError("");
    try {
      const res = await fetch("/api/interviewer/workspace/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: selectedRoom,
          interviewerName: trimmedName,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to register for room");
      }
      router.push(`/interviewer/workspace/select?room=${selectedRoom}`);
    } catch (e: any) {
      setRegisterError(e.message || "An error occurred");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] font-body-md selection:bg-[#00FF66]/30 selection:text-[#00FF66]">
      <CustomCursor />
      
      <header className="w-full sticky top-0 z-50 border-b border-[#1D2A22] bg-[#050505]/80 backdrop-blur-xl shadow-sm">
        <div className="flex items-center justify-between px-8 h-16 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00FF66] flex items-center justify-center text-[#050505] shadow-[0_0_12px_rgba(0,255,102,0.4)]">
              <span className="material-symbols-outlined text-[18px] font-bold">terminal</span>
            </div>
            <div>
              <p className="font-black text-[#F5F5F5] text-sm tracking-wide uppercase">NEXUS</p>
              <p className="text-[9px] text-[#8A938D] font-bold uppercase tracking-widest">Interviewer Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {activeEvent && (
              <div className="bg-[#101412] px-3.5 py-1.5 rounded-full flex items-center gap-2 border border-[#00FF66]/30 shadow-[0_0_12px_rgba(0,255,102,0.1)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
                <span className="text-[10px] font-black text-[#8A938D] uppercase tracking-wider hidden sm:inline">Active Event:</span>
                <span className="text-xs font-bold text-[#F5F5F5] truncate max-w-[150px] sm:max-w-[200px]">{activeEvent.name}</span>
                {eventStats && (
                  <span className="text-[10px] font-mono font-bold text-[#00FF66] bg-[#00FF66]/10 px-2 py-0.5 rounded-full border border-[#00FF66]/20">
                    {eventStats.waitingCandidates} in queue
                  </span>
                )}
              </div>
            )}
            <SignOutButton redirectUrl="/login">
              <button className="text-xs font-bold uppercase tracking-wider text-[#8A938D] hover:text-[#FF4D4D] transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Logout
              </button>
            </SignOutButton>
          </div>
        </div>
      </header>

      <main className="w-full">
        <div className="w-full max-w-5xl mx-auto px-8 py-12 space-y-8">
          {error && (
            <div className="bg-[#FF4D4D]/10 border border-[#FF4D4D]/20 text-[#FF4D4D] rounded-xl p-5 flex items-start gap-3 shadow-md">
              <span className="material-symbols-outlined mt-0.5 flex-shrink-0">error</span>
              <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
            </div>
          )}

          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-[#F5F5F5] uppercase tracking-wide mb-2 drop-shadow-[0_0_8px_rgba(0,255,102,0.3)]">
              Available Rooms
            </h1>
            <p className="text-xs text-[#8A938D] font-semibold uppercase tracking-wider">
              Select the room you are physically sitting in.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#00FF66]/30 border-t-[#00FF66] rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => {
                const isDeactivated = room.isActive === false;
                const isAvailable = room.status === "Available" && !isDeactivated;
                const isSelected = selectedRoom === room.roomNumber;
                return (
                  <button
                    key={room._id}
                    onClick={() => handleSelectRoom(room.roomNumber)}
                    disabled={registering || !isAvailable}
                    className={`bg-[#101412] border rounded-xl p-8 flex flex-col items-center justify-center gap-4 transition-all duration-300 group ${
                      isDeactivated
                        ? "border-[#1D2A22]/50 opacity-40 cursor-not-allowed"
                        : isSelected
                        ? "border-[#00FF66] shadow-[0_0_20px_rgba(0,255,102,0.15)]"
                        : "border-[#1D2A22] hover:border-[#00FF66]/60 hover:shadow-[0_0_20px_rgba(0,255,102,0.1)] hover:-translate-y-1"
                    } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0`}
                  >
                    <div className={`w-16 h-16 rounded-full bg-[#0B0D0C] flex items-center justify-center border transition-colors ${
                      isDeactivated
                        ? "border-[#1D2A22] text-[#8A938D]/40"
                        : isSelected
                        ? "border-[#00FF66] text-[#00FF66]"
                        : "border-[#1D2A22] group-hover:border-[#00FF66]/40 group-hover:text-[#00FF66] text-[#8A938D]"
                    }`}>
                      <span className="material-symbols-outlined text-[32px]">meeting_room</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-[#F5F5F5] tracking-wide uppercase truncate max-w-[220px]">
                        {room.name || `Room ${String(room.roomNumber).padStart(2, "0")}`}
                      </h2>
                      <p className={`text-[10px] font-bold mt-1.5 uppercase tracking-widest ${
                        isDeactivated ? "text-[#FF4D4D]" : "text-[#8A938D]"
                      }`}>
                        {isDeactivated ? "Deactivated" : room.status}
                      </p>
                      {room.assignedInterviewer && (
                        <p className="text-[9px] text-[#00FF66]/80 font-semibold uppercase tracking-wider mt-1">
                          Assigned: {room.assignedInterviewer}
                        </p>
                      )}
                    </div>
                    {registering && isSelected && (
                      <div className="mt-2 w-5 h-5 border-2 border-[#00FF66]/30 border-t-[#00FF66] rounded-full animate-spin"></div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selectedRoom !== null && (
            <section className="w-full max-w-2xl mx-auto mt-8">
              <div className="w-full bg-[#101412] border border-[#00FF66]/40 rounded-xl p-8 space-y-6">
                <div className="text-center">
                  <h2 className="text-lg font-black text-[#00FF66] uppercase tracking-wider mb-1">
                    Select Interviewer
                  </h2>
                  <p className="text-xs text-[#8A938D] font-bold uppercase tracking-widest">
                    Confirm your physical identity for Room {String(selectedRoom).padStart(2, "0")}
                  </p>
                </div>

                {registerError && (
                  <div className="bg-[#FF4D4D]/10 border border-[#FF4D4D]/20 text-[#FF4D4D] rounded-lg p-3 flex items-start gap-2 shadow-sm text-xs font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-sm flex-shrink-0">error</span>
                    <span>{registerError}</span>
                  </div>
                )}

                <div className="space-y-2 text-left">
                  <label htmlFor="interviewerName" className="text-[10px] text-[#8A938D] font-bold uppercase tracking-widest block">
                    Enter your name
                  </label>
                  <input
                    id="interviewerName"
                    type="text"
                    value={interviewerName}
                    onChange={(e) => setInterviewerName(e.target.value)}
                    placeholder="e.g. Ahmed, Sarah, Mudabeer"
                    disabled={registering}
                    className="w-full bg-[#050505] border border-[#1D2A22] rounded-lg px-4 py-3 text-sm text-[#F5F5F5] placeholder-[#8A938D]/50 focus:outline-none focus:border-[#00FF66] transition-colors"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoom(null);
                      setInterviewerName("");
                      setRegisterError("");
                    }}
                    disabled={registering}
                    className="flex-1 bg-[#101412] hover:bg-[#1A201D] border border-[#1D2A22] text-[#8A938D] hover:text-[#F5F5F5] font-bold uppercase tracking-wider text-xs py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRegister}
                    disabled={registering}
                    className="flex-1 bg-[#00FF66] hover:bg-[#00E55C] text-[#050505] font-bold uppercase tracking-wider text-xs py-3 rounded-lg transition-all shadow-[0_0_12px_rgba(0,255,102,0.2)] hover:shadow-[0_0_20px_rgba(0,255,102,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {registering ? (
                      <div className="w-4 h-4 border-2 border-[#050505]/30 border-t-[#050505] rounded-full animate-spin"></div>
                    ) : (
                      "Register Room"
                    )}
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
