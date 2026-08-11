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
}

interface WorkspaceData {
  room: { roomNumber: number; interviewer: string; status: string; startedAt: string | null };
  applicant: ApplicantData | null;
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0)
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ActiveInterviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomNumberStr = searchParams.get("room");
  const roomNumber = roomNumberStr ? Number(roomNumberStr) : null;

  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);

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
      
      setElapsed(wsData.applicant.interviewDuration || 0);

      // Auto-start timer on load if we have a startedAt time
      if (wsData.room.startedAt && !isRunning) {
        setIsRunning(true);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [roomNumber, isRunning]);

  useEffect(() => {
    fetchData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData]);

  // Drawer escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const handleStartResume = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
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
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save duration");
      router.push(`/interviewer/workspace/select?room=${roomNumber}`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const Skeleton = ({ w = "w-full", h = "h-4" }: { w?: string; h?: string }) => (
    <div className={`${h} ${w} bg-[#0B0D0C]/40 rounded animate-pulse`} />
  );

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
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] font-body-md selection:bg-[#00FF66]/30 selection:text-[#00FF66]">
      <CustomCursor />
      
      <header className="w-full sticky top-0 z-50 border-b border-[#1D2A22] bg-[#050505]/80 backdrop-blur-xl shadow-sm">
        <div className="flex items-center justify-between px-8 h-16 max-w-5xl mx-auto">
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
            </div>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">
        {loading ? (
          <div className="bg-[#101412] border border-[#1D2A22] p-8 rounded-xl flex flex-col gap-4 shadow-xl">
            <Skeleton h="h-8 w-1/3" />
            <Skeleton h="h-24" />
          </div>
        ) : data?.applicant ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Applicant Details */}
            <div className="bg-[#101412] border border-[#1D2A22] rounded-xl p-6 lg:col-span-1 space-y-5 shadow-xl">
              <div className="flex items-center gap-2 mb-1 border-b border-[#1D2A22] pb-3">
                <span className="material-symbols-outlined text-[#00FF66] text-lg font-bold">person_pin</span>
                <h2 className="text-xs font-black text-[#F5F5F5] uppercase tracking-widest">Candidate Info</h2>
              </div>
              
              <div>
                <h3 className="text-xl font-black text-[#F5F5F5] uppercase tracking-wide">{data.applicant.name}</h3>
                <p className="text-xs font-mono text-[#8A938D] mt-0.5">{data.applicant.rollNumber}</p>
              </div>
              <div className="space-y-4 pt-4 border-t border-[#1D2A22]/50">
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
            </div>

            {/* Timer and Actions */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="bg-[#101412] border border-[#1D2A22] rounded-xl p-8 flex flex-col items-center justify-center gap-4 min-h-[220px] relative overflow-hidden shadow-2xl">
                {isRunning && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-0.5 bg-[#FF4D4D]/10 border border-[#FF4D4D]/20 text-[#FF4D4D] rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse">
                    <span className="w-1.5 h-1.5 bg-[#FF4D4D] rounded-full"></span> Live
                  </div>
                )}
                
                <p className="text-[10px] text-[#8A938D] font-black uppercase tracking-widest">Interview Duration</p>
                <p className="font-mono font-bold text-7xl text-[#00FF66] tabular-nums tracking-tight drop-shadow-[0_0_15px_rgba(0,255,102,0.4)]">
                  {formatTime(elapsed)}
                </p>
                
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="px-4 py-5 bg-[#0B0D0C] hover:bg-[#00FF66]/10 hover:text-[#00FF66] hover:border-[#00FF66]/40 border border-[#1D2A22] rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-3 shadow-md"
                >
                  <span className="material-symbols-outlined text-[18px]">feed</span> View Application
                </button>
                <button
                  onClick={() => router.push(`/interviewer/evaluation?room=${roomNumber}`)}
                  className="px-4 py-5 bg-[#00FF66] text-[#050505] hover:bg-[#00B84A] rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(0,255,102,0.35)]"
                >
                  <span className="material-symbols-outlined text-[18px] font-bold">assignment_turned_in</span> Begin Evaluation
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* View Application Drawer */}
      {drawerOpen && data?.applicant && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={() => setDrawerOpen(false)} />
          <div style={{ position: "fixed", top: 0, right: 0, zIndex: 101, width: "min(45vw, 560px)", height: "100vh", background: "#0B0D0C", borderLeft: "1px solid #1D2A22", boxShadow: "-8px 0 32px rgba(0,0,0,0.8)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #1D2A22", background: "#0B0D0C" }}>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 900, color: "#F5F5F5", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{data.applicant.name}</h3>
                <p style={{ fontSize: "0.8rem", color: "#8A938D", margin: "4px 0 0", fontFamily: "monospace" }}>{data.applicant.rollNumber}</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="hover:text-[#00FF66] transition-colors" style={{ padding: "6px", borderRadius: "50%", border: "none", background: "transparent", color: "#8A938D", cursor: "pointer", display: "flex", alignItems: "center" }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }} className="custom-scrollbar">
              {data.applicant.responses && Object.keys(data.applicant.responses).length > 0 ? (
                <div>
                  <h4 style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: "#00FF66", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>article</span> Form Responses
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {Object.entries(data.applicant.responses).map(([question, answer], idx) => (
                      <div key={idx} style={{ borderLeft: "2px solid #00FF66", paddingLeft: "14px" }}>
                        <p style={{ fontSize: "11px", color: "#8A938D", marginBottom: "6px", fontWeight: 600 }}>{question}</p>
                        <p style={{ fontSize: "13px", color: "#F5F5F5", lineHeight: 1.6 }}>{answer || "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#8A938D" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "48px", opacity: 0.5, marginBottom: "16px" }}>feed</span>
                  <p className="text-xs font-bold uppercase tracking-wider">No form responses available.</p>
                </div>
              )}
            </div>
          </div>
        </>
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
