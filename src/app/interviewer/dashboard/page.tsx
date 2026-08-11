"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import CustomCursor from "@/components/ui/CustomCursor";

interface RoomData {
  _id: string;
  roomNumber: number;
  interviewer?: string;
  status: string;
}

export default function InterviewerDashboardPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectingRoom, setSelectingRoom] = useState<number | null>(null);

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
    fetchRooms();
  }, []);

  const handleSelectRoom = async (roomNumber: number) => {
    setSelectingRoom(roomNumber);
    try {
      const res = await fetch("/api/interviewer/workspace/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomNumber }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to register for room");
      }
      
      router.push(`/interviewer/workspace/select?room=${roomNumber}`);
    } catch (e: any) {
      alert(e.message);
      setSelectingRoom(null);
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
          <SignOutButton>
            <button className="text-xs font-bold uppercase tracking-wider text-[#8A938D] hover:text-[#FF4D4D] transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Logout
            </button>
          </SignOutButton>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-12 space-y-8">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <button
                key={room._id}
                onClick={() => handleSelectRoom(room.roomNumber)}
                disabled={selectingRoom !== null}
                className="bg-[#101412] border border-[#1D2A22] rounded-xl p-8 flex flex-col items-center justify-center gap-4 hover:border-[#00FF66]/60 transition-all hover:shadow-[0_0_20px_rgba(0,255,102,0.1)] disabled:opacity-50 disabled:cursor-not-allowed group hover:-translate-y-1 duration-300"
              >
                <div className="w-16 h-16 rounded-full bg-[#0B0D0C] flex items-center justify-center border border-[#1D2A22] group-hover:border-[#00FF66]/40 group-hover:text-[#00FF66] text-[#8A938D] transition-colors">
                  <span className="material-symbols-outlined text-[32px]">meeting_room</span>
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#F5F5F5] tracking-wide uppercase">Room {String(room.roomNumber).padStart(2, "0")}</h2>
                  <p className="text-[10px] text-[#8A938D] font-bold mt-1.5 uppercase tracking-widest">{room.status}</p>
                </div>
                {selectingRoom === room.roomNumber && (
                  <div className="mt-2 w-5 h-5 border-2 border-[#00FF66]/30 border-t-[#00FF66] rounded-full animate-spin"></div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
