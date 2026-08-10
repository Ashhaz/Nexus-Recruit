"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";

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
    <div className={`${h} ${w} bg-surface-variant/40 rounded animate-pulse`} />
  );

  if (error) {
    return (
      <div className="min-h-screen bg-background text-[#e1e2ed] flex items-center justify-center font-body-md">
        <div className="bg-error/10 border border-error/30 text-error rounded-xl p-5 flex items-start gap-3">
          <span className="material-symbols-outlined mt-0.5 flex-shrink-0">error</span>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-[#e1e2ed] font-body-md selection:bg-primary/30 selection:text-primary">
      <header className="w-full sticky top-0 z-50 border-b border-outline-variant/30 shadow-sm" style={{ background: "rgba(11,17,32,0.85)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center justify-between px-6 h-16 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-[0_0_15px_rgba(180,197,255,0.4)]">
              <span className="material-symbols-outlined text-[18px]">radio_button_checked</span>
            </div>
            <div>
              <p className="font-black text-primary text-sm tracking-tight">NEXUS</p>
              <p className="text-[9px] text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-error rounded-full animate-pulse"></span>
                Active Interview
              </p>
            </div>
          </div>
          {data && (
            <div className="flex items-center gap-3">
              <div className="glass-card px-4 py-1.5 rounded-full flex items-center gap-2 border border-primary/20">
                <span className="text-xs text-on-surface-variant uppercase">Room</span>
                <span className="text-sm font-semibold text-primary">{data.room.roomNumber}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {loading ? (
          <div className="glass-card p-8 rounded-2xl flex flex-col gap-4">
            <Skeleton h="h-8 w-1/3" />
            <Skeleton h="h-24" />
          </div>
        ) : data?.applicant ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Applicant Details */}
            <div className="glass-card rounded-2xl p-6 lg:col-span-1 space-y-5 border border-outline-variant/30">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-primary text-[20px]">person_pin</span>
                <h2 className="text-sm font-semibold text-on-surface uppercase tracking-wider">Candidate</h2>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-on-surface">{data.applicant.name}</h3>
                <p className="text-sm font-mono text-on-surface-variant">{data.applicant.rollNumber}</p>
              </div>
              <div className="space-y-3 pt-4 border-t border-outline-variant/15">
                {[
                  { label: "Interviewer", value: data.room.interviewer },
                  { label: "Department", value: data.applicant.department },
                  { label: "Branch", value: data.applicant.branch },
                  { label: "Year", value: data.applicant.year },
                  { label: "Email", value: data.applicant.email },
                  { label: "Phone", value: data.applicant.phone },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">{label}</span>
                    <span className="text-sm font-medium text-on-surface">{value || "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timer and Actions */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center gap-4 min-h-[220px] relative overflow-hidden border border-primary/20 shadow-[0_0_40px_rgba(76,215,246,0.05)]">
                {isRunning && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-error/10 border border-error/30 text-error rounded-full text-xs font-label-md uppercase tracking-wider animate-pulse">
                    <span className="w-2 h-2 bg-error rounded-full"></span> Live
                  </div>
                )}
                
                <p className="text-xs text-on-surface-variant uppercase tracking-widest">Interview Duration</p>
                <p className="font-mono font-bold text-7xl text-primary tabular-nums tracking-tight" style={{ textShadow: "0 0 24px rgba(180,197,255,0.4)" }}>
                  {formatTime(elapsed)}
                </p>
                
                <div className="flex items-center gap-3 mt-6">
                  {!isRunning ? (
                    <button onClick={handleStartResume} className="px-8 py-3 bg-primary text-on-primary rounded-xl font-label-md text-sm hover:bg-primary/90 flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(180,197,255,0.3)]">
                      <span className="material-symbols-outlined">play_arrow</span> Resume
                    </button>
                  ) : (
                    <button onClick={handlePause} className="px-8 py-3 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 rounded-xl font-label-md text-sm transition-colors flex items-center gap-2">
                      <span className="material-symbols-outlined">pause</span> Pause
                    </button>
                  )}
                  <button onClick={handleEnd} className="px-8 py-3 bg-error/10 hover:bg-error/20 text-error border border-error/30 rounded-xl font-label-md text-sm transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined">stop</span> End Interview
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="px-4 py-5 bg-surface-variant/30 hover:bg-surface-variant/50 border border-outline-variant/30 rounded-xl font-label-md text-base transition-colors flex items-center justify-center gap-3 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[20px]">feed</span> View Application
                </button>
                <button
                  onClick={() => router.push(`/interviewer/evaluation?room=${roomNumber}`)}
                  className="px-4 py-5 bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/30 rounded-xl font-label-md text-base transition-colors flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(202,193,255,0.1)]"
                >
                  <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span> Begin Evaluation
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* View Application Drawer */}
      {drawerOpen && data?.applicant && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setDrawerOpen(false)} />
          <div style={{ position: "fixed", top: 0, right: 0, zIndex: 101, width: "min(42vw, 560px)", height: "100vh", background: "#111827", borderLeft: "1px solid rgba(180,197,255,0.15)", boxShadow: "-8px 0 32px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "24px 28px", borderBottom: "1px solid rgba(180,197,255,0.1)", background: "rgba(17,24,39,0.95)" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#e1e2ed", margin: 0 }}>{data.applicant.name}</h3>
                <p style={{ fontSize: "0.85rem", color: "#9aa0b4", margin: "4px 0 0", fontFamily: "monospace" }}>{data.applicant.rollNumber}</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} style={{ padding: "8px", borderRadius: "50%", border: "none", background: "rgba(180,197,255,0.1)", color: "#e1e2ed", cursor: "pointer", display: "flex", alignItems: "center" }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "28px", display: "flex", flexDirection: "column", gap: "32px" }}>
              {data.applicant.responses && Object.keys(data.applicant.responses).length > 0 ? (
                <div>
                  <h4 style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9aa0b4", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>article</span> Form Responses
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {Object.entries(data.applicant.responses).map(([question, answer], idx) => (
                      <div key={idx} style={{ borderLeft: "3px solid rgba(180,197,255,0.3)", paddingLeft: "16px" }}>
                        <p style={{ fontSize: "12px", color: "#9aa0b4", marginBottom: "6px", fontWeight: 600 }}>{question}</p>
                        <p style={{ fontSize: "14px", color: "#e1e2ed", lineHeight: 1.7 }}>{answer || "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9aa0b4" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "48px", opacity: 0.5, marginBottom: "16px" }}>feed</span>
                  <p>No form responses available.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .glass-card {
          background: rgba(17, 24, 39, 0.7);
          backdrop-filter: blur(12px);
        }
      ` }} />
    </div>
  );
}
