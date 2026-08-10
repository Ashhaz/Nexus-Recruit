"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";

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

  // Logout handled by Clerk's SignOutButton

  return (
    <div className="min-h-screen bg-background text-[#e1e2ed] font-body-md selection:bg-primary/30 selection:text-primary">
      <header className="w-full sticky top-0 z-50 border-b border-outline-variant/30 shadow-sm" style={{ background: "rgba(11,17,32,0.85)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center justify-between px-6 h-16 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[18px]">terminal</span>
            </div>
            <div>
              <p className="font-black text-primary text-sm tracking-tight">NEXUS</p>
              <p className="text-[9px] text-on-surface-variant uppercase tracking-widest">Interviewer Portal</p>
            </div>
          </div>
          <SignOutButton>
            <button className="text-sm font-label-md text-on-surface-variant hover:text-error transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Logout
            </button>
          </SignOutButton>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        {error && (
          <div className="bg-error/10 border border-error/30 text-error rounded-xl p-5 flex items-start gap-3">
            <span className="material-symbols-outlined mt-0.5 flex-shrink-0">error</span>
            <p>{error}</p>
          </div>
        )}

        <div className="text-center mb-10">
          <h1 className="font-headline-lg text-primary font-black mb-2" style={{ textShadow: "0 0 12px rgba(180,197,255,0.4)" }}>
            Available Rooms
          </h1>
          <p className="text-on-surface-variant font-body-lg">
            Select the room you are physically sitting in.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <button
                key={room._id}
                onClick={() => handleSelectRoom(room.roomNumber)}
                disabled={selectingRoom !== null}
                className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-all hover:shadow-[0_0_20px_rgba(180,197,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-colors">
                  <span className="material-symbols-outlined text-[32px] text-primary">meeting_room</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-on-surface">Room {room.roomNumber}</h2>
                  <p className="text-xs text-on-surface-variant mt-1 uppercase tracking-widest">{room.status}</p>
                </div>
                {selectingRoom === room.roomNumber && (
                  <div className="mt-2 w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .glass-card {
          background: rgba(17, 24, 39, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(180, 197, 255, 0.1);
        }
      ` }} />
    </div>
  );
}
