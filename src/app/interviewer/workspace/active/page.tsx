"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import CustomCursor from "@/components/ui/CustomCursor";

interface ApplicantData {
  _id: string;
  name: string;
  rollNumber: string;
  department?: string;
  branch?: string;
  year?: string;
  email?: string;
  phone?: string;
  responses: Record<string, string>;
  interviewDuration: number;
  interviewNotes?: string;
}

interface WorkspaceData {
  room: {
    roomNumber: number;
    interviewerId: string;
    interviewer: string;
    status: string;
    startedAt: string | null;
    pausedAt: string | null;
    accumulatedTime: number;
  };
  applicant: ApplicantData | null;
}

const Skeleton = ({ w = "w-full", h = "h-4" }: { w?: string; h?: string }) => (
  <div className={`${h} ${w} bg-[#0B0D0C]/40 rounded animate-pulse`} />
);

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0)
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const excludedKeys = new Set([
  "name",
  "gender",
  "roll number",
  "roll number : example: 23081a7301",
  "year of studying",
  "branch",
  "email address",
  "contact number",
  "contact number (no +91 or gaps)",
  "contact number (🚫 no +91 or gaps)",
  "timestamp"
]);

export default function ActiveInterviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomNumberStr = searchParams.get("room");
  const roomNumber = roomNumberStr ? Number(roomNumberStr) : null;

  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isReadOnly, setIsReadOnly] = useState(false);

  const [interviewerName, setInterviewerName] = useState<string>("");
  const [interviewerId, setInterviewerId] = useState<string>("");

  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [notes, setNotes] = useState("");

  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json();
        if (json.success && json.user.role === "admin") {
          const isConducting = localStorage.getItem(`nexus_admin_conducting_${roomNumber}`) === "true";
          if (!isConducting) {
            setIsReadOnly(true);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    if (roomNumber) {
      checkRole();
    }
  }, [roomNumber]);

  const fetchData = useCallback(async () => {
    if (!roomNumber) {
      setError("No room number provided. Add ?room=X to the URL.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/interviewer/workspace?room=${roomNumber}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load workspace");
      
      const wsData = json as WorkspaceData;
      setData(wsData);

      if (!wsData.applicant) {
        throw new Error("No applicant assigned. Go back and select an applicant.");
      }

      setInterviewerName(wsData.room.interviewer ?? "");
      setInterviewerId(wsData.room.interviewerId ?? "");
      
      if (wsData.applicant.interviewNotes) {
        setNotes(wsData.applicant.interviewNotes);
      }

      // Timer hydration logic
      let initialElapsed = 0;
      let initialIsRunning = false;

      if (wsData.room.pausedAt !== null) {
        initialElapsed = wsData.room.accumulatedTime;
        initialIsRunning = false;
      } else if (wsData.room.startedAt !== null && wsData.room.pausedAt === null) {
        initialElapsed =
          wsData.room.accumulatedTime +
          Math.floor((Date.now() - new Date(wsData.room.startedAt).getTime()) / 1000);
        initialIsRunning = true;
      } else {
        initialElapsed = wsData.applicant.interviewDuration || 0;
        initialIsRunning = false;
      }

      setElapsed(initialElapsed);
      setIsRunning(initialIsRunning);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [roomNumber]);

  useEffect(() => {
    fetchData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData]);

  // Timer interval logic using server state source of truth
  useEffect(() => {
    if (isRunning && data?.room.startedAt) {
      const startTime = new Date(data.room.startedAt).getTime();
      const accum = data.room.accumulatedTime;
      
      const updateTimer = () => {
        const currentElapsed = accum + Math.floor((Date.now() - startTime) / 1000);
        setElapsed(currentElapsed);
      };
      
      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, data?.room.startedAt, data?.room.accumulatedTime]);

  const handleStartResume = async () => {
    if (!roomNumber || !interviewerId || !interviewerName) return;
    try {
      const res = await fetch("/api/interviewer/workspace/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber,
          interviewerId,
          interviewerName,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to resume interview");
      
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          room: {
            ...prev.room,
            startedAt: json.room.startedAt,
            pausedAt: json.room.pausedAt,
            accumulatedTime: json.room.accumulatedTime,
          },
        };
      });
      
      const newElapsed = json.room.accumulatedTime +
        Math.floor((Date.now() - new Date(json.room.startedAt).getTime()) / 1000);
      setElapsed(newElapsed);
      setIsRunning(true);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handlePause = async () => {
    if (!roomNumber || !interviewerId || !interviewerName) return;
    try {
      const res = await fetch("/api/interviewer/workspace/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber,
          interviewerId,
          interviewerName,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to pause interview");
      
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          room: {
            ...prev.room,
            startedAt: json.room.startedAt,
            pausedAt: json.room.pausedAt,
            accumulatedTime: json.room.accumulatedTime,
          },
        };
      });
      
      setElapsed(json.room.accumulatedTime);
      setIsRunning(false);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleEnd = async () => {
    setIsRunning(false);
    if (!data || !data.applicant) return;
    try {
      const res = await fetch("/api/interviewer/workspace/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantId: data.applicant._id,
          duration: elapsed,
          notes,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save duration and notes");
      router.push(`/interviewer/evaluation?room=${roomNumber}&name=${encodeURIComponent(data.room.interviewer || "")}`);
    } catch (e: any) {
      alert(e.message);
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

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] font-body-md selection:bg-[#00FF66]/30 selection:text-[#00FF66] flex flex-col">
      <CustomCursor />
      
      <header className="w-full sticky top-0 z-50 border-b border-[#1D2A22] bg-[#050505]/80 backdrop-blur-xl shadow-sm">
        <div className="flex items-center justify-between px-8 h-16 max-w-[1600px] w-full mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00FF66] flex items-center justify-center text-[#050505] shadow-[0_0_12px_rgba(0,255,102,0.4)]">
              <span className="material-symbols-outlined text-[18px] font-bold">radio_button_checked</span>
            </div>
            <div>
              <p className="font-black text-[#F5F5F5] text-sm tracking-wide uppercase">NEXUS</p>
              <p className="text-[9px] text-[#FF4D4D] font-bold uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#FF4D4D] rounded-full animate-pulse"></span>
                Active Interview
              </p>
            </div>
          </div>
          {data && (
            <div className="flex items-center gap-3">
              <div className="bg-[#101412] px-4 py-1.5 rounded-full flex items-center gap-2 border border-[#1D2A22]">
                <span className="text-[9px] font-bold text-[#8A938D] uppercase tracking-wider">Room</span>
                <span className="text-sm font-black text-[#00FF66]">{data.room.roomNumber}</span>
              </div>
              <div className="bg-[#101412] px-4 py-1.5 rounded-full flex items-center gap-2 border border-[#1D2A22]">
                <span className="material-symbols-outlined text-[16px] text-[#8A938D]">person</span>
                <span className="text-xs font-bold text-[#F5F5F5]">{data.room.interviewer}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="w-full flex-1">
        <div className="max-w-[1600px] w-full mx-auto px-8 py-8">
          {loading ? (
            <div className="bg-[#101412] border border-[#1D2A22] p-8 rounded-xl flex flex-col gap-4 shadow-xl">
              <Skeleton h="h-8 w-1/3" />
              <Skeleton h="h-24" />
            </div>
          ) : data?.applicant ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(220px,25%)_minmax(320px,40%)_minmax(320px,35%)] gap-6 items-start">
              
              {/* LEFT Column: Candidate Info */}
              <section className="w-full bg-[#101412] border border-[#1D2A22] rounded-xl p-6 lg:h-[calc(100vh-12rem)] flex flex-col shadow-xl overflow-hidden">
                <div className="flex items-center gap-2 mb-1 border-b border-[#1D2A22] pb-3">
                  <span className="material-symbols-outlined text-[#00FF66] text-lg font-bold">person_pin</span>
                  <h2 className="text-xs font-black text-[#F5F5F5] uppercase tracking-widest">Candidate Info</h2>
                </div>
                
                <div className="mt-4">
                  <h3 className="text-xl font-black text-[#F5F5F5] uppercase tracking-wide">{data.applicant.name}</h3>
                  <p className="text-xs font-mono text-[#8A938D] mt-0.5">{data.applicant.rollNumber}</p>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 mt-4 space-y-4 pt-4 border-t border-[#1D2A22]/50">
                  {[
                    { label: "Interviewer", value: data.room.interviewer },
                    { label: "Department", value: data.applicant.department },
                    { label: "Branch", value: data.applicant.branch },
                    { label: "Year", value: data.applicant.year },
                    { label: "Email", value: data.applicant.email },
                    { label: "Phone", value: data.applicant.phone },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col">
                      <span className="text-[9px] uppercase tracking-widest text-[#8A938D] font-bold">{label}</span>
                      <span className="text-sm font-semibold text-[#F5F5F5] mt-0.5">{value || "—"}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* CENTER Column: Interview Control & Notes */}
              <section className="w-full flex flex-col gap-6 lg:h-[calc(100vh-12rem)]">
                <div className="bg-[#101412] border border-[#1D2A22] rounded-xl p-8 flex flex-col gap-4 flex-1 relative overflow-hidden shadow-2xl lg:h-full">
                  {isRunning && (
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-0.5 bg-[#00FF66]/10 border border-[#00FF66]/20 text-[#00FF66] rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse">
                      <span className="w-1.5 h-1.5 bg-[#00FF66] rounded-full"></span> Live
                    </div>
                  )}
                  
                  <div className="flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] text-[#8A938D] font-black uppercase tracking-widest mt-2">
                      {isRunning ? "Interview Live" : "Interview Paused"}
                    </p>
                    <p className="font-mono font-bold text-7xl text-[#00FF66] tabular-nums tracking-tight drop-shadow-[0_0_15px_rgba(0,255,102,0.4)] mt-2">
                      {formatTime(elapsed)}
                    </p>
                    
                    {!isReadOnly && (
                      <>
                        <div className="flex items-center gap-3 mt-6">
                          {!isRunning ? (
                            <button onClick={handleStartResume} className="px-8 py-3 bg-[#00FF66] text-[#050505] rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-[#00B84A] flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,255,102,0.3)]">
                              <span className="material-symbols-outlined text-sm font-bold">play_arrow</span> Resume
                            </button>
                          ) : (
                            <button onClick={handlePause} className="px-8 py-3 bg-[#0B0D0C] border border-[#1D2A22] text-[#F5F5F5] hover:bg-[#101412] rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm font-bold">pause</span> Pause
                            </button>
                          )}
                          <button onClick={handleEnd} className="px-8 py-3 bg-[#FF4D4D] text-[#F5F5F5] hover:bg-[#D32F2F] rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(255,77,77,0.25)]">
                            <span className="material-symbols-outlined text-sm font-bold">stop</span> End Interview
                          </button>
                        </div>

                        <button
                          onClick={() => router.push(`/interviewer/evaluation?room=${roomNumber}&name=${encodeURIComponent(data.room.interviewer || "")}`)}
                          className="w-full mt-6 py-4 bg-[#00FF66]/10 hover:bg-[#00FF66]/20 border border-[#00FF66]/30 text-[#00FF66] rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-sm font-bold">assignment_turned_in</span> Begin Evaluation
                        </button>
                      </>
                    )}
                    {isReadOnly && (
                      <div className="mt-6 p-3 border border-[#1D2A22] rounded-lg bg-[#0B0D0C]/50 text-center">
                        <p className="text-[10px] text-[#8A938D] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-[#00FF66]">visibility</span>
                          Viewing Mode (Read-Only)
                        </p>
                      </div>
                    )}
                  </div>

                  <hr className="border-[#1D2A22] my-4" />

                  <div className="flex-1 flex flex-col min-h-[180px] text-left">
                    <label htmlFor="notes" className="text-[10px] text-[#8A938D] font-black uppercase tracking-widest mb-2 block">
                      Interviewer Notes
                    </label>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={isReadOnly}
                      placeholder={isReadOnly ? "No notes available in view mode." : "Type observations during the interview..."}
                      className="flex-1 w-full bg-[#0B0D0C] border border-[#1D2A22] rounded-lg px-4 py-3 text-sm text-[#F5F5F5] placeholder:text-[#8A938D]/40 focus:ring-1 focus:ring-[#00FF66] focus:border-[#00FF66] transition-all outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </section>

              {/* RIGHT Column: Application Responses */}
              <section className="w-full bg-[#101412] border border-[#1D2A22] rounded-xl p-6 lg:h-[calc(100vh-12rem)] flex flex-col shadow-xl overflow-hidden">
                <div className="flex items-center gap-2 mb-1 border-b border-[#1D2A22] pb-3">
                  <span className="material-symbols-outlined text-[#00FF66] text-lg font-bold">article</span>
                  <h2 className="text-xs font-black text-[#F5F5F5] uppercase tracking-widest">Application Responses</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6 pt-4">
                  {(() => {
                    const filteredResponses = Object.entries(data.applicant.responses || {}).filter(([key, value]) => {
                      const normalizedKey = key
                        .trim()
                        .toLowerCase()
                        .replace(/\s+/g, " ")
                        .replace(/\s*[:：]\s*$/, "");
                      
                      if (excludedKeys.has(normalizedKey)) {
                        return false;
                      }

                      if (value == null) return false;
                      if (typeof value === "string" && value.trim() === "") {
                        return false;
                      }

                      return true;
                    });

                    if (filteredResponses.length === 0) {
                      return (
                        <div className="text-center py-20 text-[#8A938D]">
                          <p className="text-xs font-bold uppercase tracking-wider">No responses available.</p>
                        </div>
                      );
                    }

                    return filteredResponses.map(([question, answer], idx) => (
                      <div key={idx} className="space-y-2 border-b border-[#1D2A22]/50 pb-4 last:border-0 last:pb-0">
                        <p className="text-[9px] text-[#8A938D] font-black uppercase tracking-widest break-words">{question}</p>
                        <p className="text-sm text-[#F5F5F5] leading-relaxed break-words">{answer || "—"}</p>
                      </div>
                    ));
                  })()}
                </div>
              </section>

            </div>
          ) : null}
        </div>
      </main>

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
