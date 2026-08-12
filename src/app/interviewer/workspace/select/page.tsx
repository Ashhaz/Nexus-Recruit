"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import CustomCursor from "@/components/ui/CustomCursor";

interface ApplicantData {
  _id: string;
  name: string;
  rollNumber: string;
  department?: string;
  year?: string;
}

interface RoomData {
  roomNumber: number;
  interviewerId: string;
  interviewer: string;
  status: string;
  startedAt: string | null;
  pausedAt: string | null;
  accumulatedTime: number;
}

export default function ApplicantSelectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomNumberStr = searchParams.get("room");
  const roomNumber = roomNumberStr ? Number(roomNumberStr) : null;

  const [interviewerName, setInterviewerName] = useState<string>("");
  const [interviewerId, setInterviewerId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ApplicantData[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Leave room state
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  const fetchRoomData = useCallback(async () => {
    if (!roomNumber) {
      setError("No room number provided. Add ?room=X to the URL.");
      setLoading(false);
      return;
    }
    try {
      const resRoom = await fetch(`/api/interviewer/workspace?room=${roomNumber}`);
      const jsonRoom = await resRoom.json();
      if (!jsonRoom.success) throw new Error(jsonRoom.error || "Failed to load room");

      // Physical identity always comes from the registered room document
      setInterviewerName(jsonRoom.room.interviewer ?? "");
      setInterviewerId(jsonRoom.room.interviewerId ?? "");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [roomNumber]);

  useEffect(() => {
    fetchRoomData();
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [fetchRoomData]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setSelectedApplicant(null);

    if (val.length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/applicants/search?q=${encodeURIComponent(val)}&status=Waiting`);
        const data = await res.json();
        setSearchResults(data.applicants || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleStartInterview = async () => {
    if (!selectedApplicant || !roomNumber) return;
    setIsStarting(true);
    try {
      const res = await fetch("/api/interviewer/workspace/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber,
          applicantId: selectedApplicant._id,
          interviewerId,
          interviewerName,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to start interview");
      
      router.push(`/interviewer/workspace/active?room=${roomNumber}`);
    } catch (e: any) {
      alert(e.message);
      setIsStarting(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!roomNumber) return;
    setLeaving(true);
    setLeaveError("");
    try {
      const res = await fetch("/api/interviewer/workspace/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber,
          interviewerId,
          interviewerName,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to leave room.");

      setLeaveConfirmOpen(false);
      router.push("/interviewer/dashboard");
    } catch (e: any) {
      setLeaveError(e.message);
    } finally {
      setLeaving(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#F5F5F5] flex items-center justify-center font-body-md">
        <CustomCursor />
        <div className="bg-[#FF4D4D]/10 border border-[#FF4D4D]/20 text-[#FF4D4D] rounded-xl p-5 flex items-start gap-3 shadow-md">
          <span className="material-symbols-outlined mt-0.5 flex-shrink-0">error</span>
          <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <CustomCursor />
        <div className="w-8 h-8 border-2 border-[#00FF66]/30 border-t-[#00FF66] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] font-body-md selection:bg-[#00FF66]/30 selection:text-[#00FF66] flex flex-col">
      <CustomCursor />
      
      <header className="w-full sticky top-0 z-50 border-b border-[#1D2A22] bg-[#050505]/80 backdrop-blur-xl shadow-sm">
        <div className="flex items-center justify-between px-8 h-16 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00FF66] flex items-center justify-center text-[#050505] shadow-[0_0_12px_rgba(0,255,102,0.4)]">
              <span className="material-symbols-outlined text-[18px] font-bold">person_search</span>
            </div>
            <div>
              <p className="font-black text-[#F5F5F5] text-sm tracking-wide uppercase">NEXUS</p>
              <p className="text-[9px] text-[#8A938D] font-bold uppercase tracking-widest">Select Applicant</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-[#101412] px-4 py-1.5 rounded-full flex items-center gap-2 border border-[#1D2A22]">
              <span className="text-[9px] font-bold text-[#8A938D] uppercase tracking-wider">Room</span>
              <span className="text-sm font-black text-[#00FF66]">{roomNumber}</span>
            </div>
            <div className="bg-[#101412] px-4 py-1.5 rounded-full flex items-center gap-2 border border-[#1D2A22]">
              <span className="material-symbols-outlined text-[16px] text-[#8A938D]">person</span>
              <span className="text-xs font-bold text-[#F5F5F5]">{interviewerName}</span>
            </div>
            <button
              onClick={() => setLeaveConfirmOpen(true)}
              className="text-xs font-bold uppercase tracking-wider text-[#8A938D] hover:text-[#FF4D4D] border border-[#1D2A22] hover:border-[#FF4D4D]/30 bg-[#101412] px-4 py-1.5 rounded-full transition-colors flex items-center gap-2"
            >
              Leave Room
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-5xl w-full mx-auto p-8 flex flex-col items-center mt-8">
        
        {!selectedApplicant ? (
          <div className="w-full max-w-2xl bg-[#101412] rounded-xl p-8 md:p-12 shadow-2xl border border-[#1D2A22]">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-black text-[#F5F5F5] uppercase tracking-wide">Select Applicant</h2>
              <p className="text-xs text-[#8A938D] font-semibold uppercase tracking-wider mt-3">Search for a waiting candidate to begin the interview process.</p>
            </div>

            <div className="w-full flex flex-col gap-3 text-left">
              <label className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest pl-1">Search Database</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#8A938D] text-[24px]">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Name or Roll Number..."
                  className="w-full bg-[#0B0D0C] border border-[#1D2A22] rounded-lg pl-12 pr-10 py-4 text-sm focus:ring-1 focus:ring-[#00FF66] focus:border-[#00FF66] transition-all outline-none text-[#F5F5F5] placeholder:text-[#8A938D]/40"
                />
                {isSearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 border-2 border-[#00FF66]/30 border-t-[#00FF66] rounded-full animate-spin"></div>
                )}
              </div>

              {/* Results list */}
              {searchResults.length > 0 && (
                <ul className="max-h-72 overflow-y-auto border border-[#1D2A22] rounded-lg bg-[#0B0D0C] divide-y divide-[#1D2A22] mt-4 shadow-2xl custom-scrollbar">
                  {searchResults.map((a) => (
                    <li key={a._id}>
                      <button
                        onClick={() => {
                          setSelectedApplicant(a);
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="w-full text-left px-6 py-4 hover:bg-[#00FF66]/5 transition-colors group flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-bold text-[#F5F5F5] group-hover:text-[#00FF66] transition-colors">{a.name}</p>
                          <p className="text-xs text-[#8A938D] mt-0.5 font-mono">{a.rollNumber}</p>
                          {(a.department || a.year) && (
                            <p className="text-[10px] text-[#8A938D]/60 mt-1.5 font-bold uppercase tracking-wider">
                              {[a.department, a.year].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                        <span className="material-symbols-outlined text-[#8A938D] group-hover:text-[#00FF66] transition-colors text-sm font-bold">arrow_forward</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* No results */}
              {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                <p className="text-xs text-[#8A938D] mt-4 text-center font-semibold uppercase tracking-wider">No waiting applicants found for &ldquo;{searchQuery}&rdquo;</p>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-xl bg-[#101412] rounded-xl p-8 md:p-12 shadow-2xl border border-[#00FF66]/20 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-[#00FF66]/10 rounded-full flex items-center justify-center border border-[#00FF66]/20 mb-6 shadow-inner text-[#00FF66]">
              <span className="material-symbols-outlined text-4xl">person_check</span>
            </div>
            
            <h3 className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest mb-2">Confirm Selection</h3>
            <h2 className="text-3xl font-black text-[#F5F5F5] mb-2 uppercase tracking-wide">{selectedApplicant.name}</h2>
            <p className="text-lg font-mono text-[#00FF66] font-bold mb-8">{selectedApplicant.rollNumber}</p>

            <div className="w-full grid grid-cols-2 gap-4 mb-10 text-left">
              <div className="bg-[#0B0D0C]/40 rounded-lg p-4 border border-[#1D2A22]">
                <p className="text-[9px] text-[#8A938D] font-black uppercase tracking-widest mb-1">Room</p>
                <p className="text-base font-bold text-[#F5F5F5]">{roomNumber}</p>
              </div>
              <div className="bg-[#0B0D0C]/40 rounded-lg p-4 border border-[#1D2A22]">
                <p className="text-[9px] text-[#8A938D] font-black uppercase tracking-widest mb-1">Interviewer</p>
                <p className="text-base font-bold text-[#F5F5F5] truncate">{interviewerName}</p>
              </div>
            </div>

            <button
              onClick={handleStartInterview}
              disabled={isStarting}
              className="w-full py-4 bg-[#00FF66] text-[#050505] hover:bg-[#00B84A] rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(0,255,102,0.35)] disabled:opacity-50 disabled:shadow-none tracking-widest"
            >
              {isStarting ? (
                <>
                  <div className="w-5 h-5 border-2 border-[#050505]/30 border-t-[#050505] rounded-full animate-spin"></div>
                  STARTING...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm font-bold">play_circle</span>
                  START INTERVIEW
                </>
              )}
            </button>

            <button
              onClick={() => setSelectedApplicant(null)}
              disabled={isStarting}
              className="mt-6 text-xs text-[#8A938D] hover:text-[#00FF66] font-bold uppercase tracking-wider transition-colors"
            >
              Cancel and search again
            </button>
          </div>
        )}
      </div>

      {leaveConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/80 backdrop-blur-md">
          <div className="bg-[#101412] border border-[#1D2A22] rounded-xl p-8 max-w-sm w-full mx-4 space-y-6 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[#1D2A22] pb-4">
              <span className="material-symbols-outlined text-[#FF4D4D] text-2xl">warning</span>
              <h2 className="text-lg font-black text-[#F5F5F5] uppercase tracking-wide">Leave Room?</h2>
            </div>
            
            <p className="text-xs text-[#8A938D] font-semibold uppercase tracking-wider leading-relaxed">
              You are currently registered in <strong>Room {roomNumber}</strong>. If you leave, this room will become available for other physical interviewers.
            </p>

            {leaveError && (
              <p className="text-xs font-bold uppercase tracking-wider text-[#FF4D4D] bg-[#FF4D4D]/10 p-3 rounded-lg">
                {leaveError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setLeaveConfirmOpen(false);
                  setLeaveError("");
                }}
                disabled={leaving}
                className="px-4 py-2 border border-[#1D2A22] text-[#8A938D] hover:text-[#F5F5F5] hover:bg-[#101412] rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveRoom}
                disabled={leaving}
                className="px-4 py-2 bg-[#FF4D4D] hover:bg-[#D32F2F] text-[#050505] font-bold rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,77,77,0.2)] disabled:opacity-50"
              >
                {leaving ? "Leaving..." : "Leave Room"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1D2A22;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #00FF66/30;
        }
      ` }} />
    </div>
  );
}
