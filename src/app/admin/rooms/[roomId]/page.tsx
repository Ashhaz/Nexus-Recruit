"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import CustomCursor from "@/components/ui/CustomCursor";

// Mock Data for the Workspace
const MOCK_APPLICANT = {
  name: "Alex Chen",
  rollNo: "21BCE0452",
  department: "Computer Science",
  year: "3rd Year",
  teamApplied: "Technical Team",
  responses: {
    "Why do you want to join the core team?": "I am deeply passionate about building scalable systems and working with talented engineers. The technical team at NEXUS is known for its rigorous standards and high-impact projects.",
    "Describe a challenging technical project you've led.": "I recently led a team of 4 to develop an automated inventory management system. We faced heavy concurrency issues, but we managed to resolve them by implementing a distributed lock mechanism using Redis.",
    "Preferred Domain": "Backend Development",
    "Experience Level": "Intermediate (2+ years)",
    "Availability": "Immediate (15+ hrs/week)"
  }
};

export default function InterviewWorkspacePage() {
  const { roomId } = useParams();
  const router = useRouter();

  // Timer State
  const [timerStatus, setTimerStatus] = useState<"idle" | "running" | "paused" | "stopped">("idle");
  const [elapsedTime, setElapsedTime] = useState(0);

  // Evaluation State
  const [ratings, setRatings] = useState({
    Technical: 3,
    Communication: 3,
    ProblemSolving: 3,
    Confidence: 3,
    CulturalFit: 3
  });
  const [notes, setNotes] = useState("");
  const [decision, setDecision] = useState<"Approved" | "Pending" | "Discussion Needed" | null>(null);

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerStatus === "running") {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerStatus]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleSave = () => {
    if (!decision) {
      setToast({ message: "Please select a Final Decision.", type: "error" });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    
    // Mock save
    setToast({ message: "Interview evaluation saved successfully (Local Mock).", type: "success" });
    setTimeout(() => {
      setToast(null);
      router.push("/admin/rooms");
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-[#F5F5F5] font-body-md selection:bg-[#00FF66]/30 selection:text-[#00FF66]">
      <CustomCursor />
      
      {/* Top Header */}
      <header className="w-full sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-[#1D2A22] shadow-sm h-16">
        <div className="flex items-center justify-between px-8 h-full w-full mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/admin/rooms" className="w-9 h-9 rounded-full border border-[#1D2A22] hover:border-[#00FF66] hover:text-[#00FF66] flex items-center justify-center transition-colors bg-[#0B0D0C]">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </Link>
            <div className="h-6 w-[1px] bg-[#1D2A22] mx-2"></div>
            <div>
              <h1 className="text-sm font-black text-[#F5F5F5] uppercase tracking-wider">Room {roomId} Workspace</h1>
              <p className="text-[9px] font-bold tracking-widest text-[#8A938D] uppercase">Active Session</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 bg-[#FF4D4D]/10 text-[#FF4D4D] border border-[#FF4D4D]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D4D] animate-pulse"></span>
              LIVE
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 overflow-hidden h-[calc(100vh-64px)] flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Applicant Data */}
        <section className="w-full lg:w-[35%] flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          
          <div className="bg-[#101412] rounded-xl p-6 scanning border border-[#1D2A22] relative overflow-hidden shadow-xl">
            <div className="flex items-start gap-4 relative z-10">
              <div className="w-16 h-16 rounded-xl bg-[#0B0D0C] border border-[#1D2A22] flex flex-shrink-0 items-center justify-center text-[#00FF66]">
                <span className="material-symbols-outlined text-3xl">person</span>
              </div>
              <div>
                <h2 className="text-lg font-black text-[#F5F5F5] tracking-wide uppercase">{MOCK_APPLICANT.name}</h2>
                <p className="text-[#8A938D] font-mono text-xs mt-0.5 mb-2">{MOCK_APPLICANT.rollNo}</p>
                <div className="space-y-1.5">
                  <div className="flex gap-2 text-xs font-semibold text-[#8A938D] uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[14px]">school</span>
                    {MOCK_APPLICANT.department}, {MOCK_APPLICANT.year}
                  </div>
                  <div className="flex gap-2 text-xs font-semibold text-[#8A938D] uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[14px]">group</span>
                    {MOCK_APPLICANT.teamApplied}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#101412] rounded-xl border border-[#1D2A22] flex-1 flex flex-col overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[#1D2A22] bg-[#0B0D0C]/40">
              <h3 className="text-xs font-black text-[#F5F5F5] uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00FF66] text-base">description</span>
                Application Responses
              </h3>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1">
              {Object.entries(MOCK_APPLICANT.responses).map(([question, answer], index) => {
                if (answer.length > 50) {
                  return (
                    <div key={index} className="space-y-1">
                      <label className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest">{question}</label>
                      <p className="p-3 bg-[#0B0D0C] rounded-lg border-l-2 border-[#00FF66] text-xs text-[#F5F5F5] leading-relaxed">
                        {answer}
                      </p>
                    </div>
                  );
                }
                return null;
              })}
              
              <div className="border border-[#1D2A22] rounded-lg overflow-hidden bg-[#0B0D0C] mt-2">
                <div className="divide-y divide-[#1D2A22]">
                  {Object.entries(MOCK_APPLICANT.responses).map(([question, answer], index) => {
                    if (answer.length <= 50) {
                      return (
                        <div key={index} className="grid grid-cols-2 p-3 hover:bg-[#101412]/50">
                          <span className="text-[10px] font-bold text-[#8A938D] uppercase tracking-wider">{question}</span>
                          <span className="text-xs font-semibold text-[#F5F5F5] text-right">{answer}</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Center Column: Timer & Controls */}
        <section className="w-full lg:w-[25%] flex flex-col gap-6">
          <div className="bg-[#101412] rounded-xl border border-[#1D2A22] p-6 flex flex-col items-center justify-center flex-1 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-[#00FF66]">
              <span className="material-symbols-outlined text-8xl">schedule</span>
            </div>
            <h3 className="text-[10px] text-[#8A938D] font-black uppercase tracking-widest mb-6 z-10">Session Timer</h3>
            
            <div className={`font-mono text-6xl font-bold tracking-tighter tabular-nums mb-8 z-10 transition-all ${timerStatus === 'running' ? 'text-[#00FF66] drop-shadow-[0_0_15px_rgba(0,255,102,0.4)]' : 'text-[#F5F5F5]'}`}>
              {formatTime(elapsedTime)}
            </div>

            <div className="grid grid-cols-2 gap-3 w-full z-10">
              {timerStatus === 'idle' && (
                <button onClick={() => setTimerStatus('running')} className="col-span-2 py-3 bg-[#00FF66] text-[#050505] rounded-lg text-[10px] font-black uppercase tracking-wider flex justify-center items-center gap-2 hover:bg-[#00B84A] transition-all active:scale-95 shadow-[0_0_15px_rgba(0,255,102,0.3)]">
                  <span className="material-symbols-outlined text-sm font-bold">play_arrow</span> START
                </button>
              )}
              
              {timerStatus === 'running' && (
                <>
                  <button onClick={() => setTimerStatus('paused')} className="py-3 bg-[#0B0D0C] border border-[#1D2A22] text-[#F5F5F5] rounded-lg text-[10px] font-black uppercase tracking-wider flex justify-center items-center gap-2 hover:bg-[#101412] transition-all active:scale-95">
                    <span className="material-symbols-outlined text-sm font-bold">pause</span> PAUSE
                  </button>
                  <button onClick={() => setTimerStatus('stopped')} className="py-3 bg-[#FF4D4D] text-[#F5F5F5] rounded-lg text-[10px] font-black uppercase tracking-wider flex justify-center items-center gap-2 hover:bg-[#D32F2F] transition-all active:scale-95 shadow-[0_0_15px_rgba(255,77,77,0.3)]">
                    <span className="material-symbols-outlined text-sm font-bold">stop</span> STOP
                  </button>
                </>
              )}
              
              {timerStatus === 'paused' && (
                <>
                  <button onClick={() => setTimerStatus('running')} className="py-3 bg-[#00FF66] text-[#050505] rounded-lg text-[10px] font-black uppercase tracking-wider flex justify-center items-center gap-2 hover:bg-[#00B84A] transition-all active:scale-95 shadow-[0_0_15px_rgba(0,255,102,0.3)]">
                    <span className="material-symbols-outlined text-sm font-bold">play_arrow</span> RESUME
                  </button>
                  <button onClick={() => setTimerStatus('stopped')} className="py-3 bg-[#FF4D4D] text-[#F5F5F5] rounded-lg text-[10px] font-black uppercase tracking-wider flex justify-center items-center gap-2 hover:bg-[#D32F2F] transition-all active:scale-95 shadow-[0_0_15px_rgba(255,77,77,0.3)]">
                    <span className="material-symbols-outlined text-sm font-bold">stop</span> STOP
                  </button>
                </>
              )}

              {timerStatus === 'stopped' && (
                <button disabled className="col-span-2 py-3 bg-[#0B0D0C] border border-[#1D2A22] opacity-50 text-[#8A938D] rounded-lg text-[10px] font-black uppercase tracking-wider flex justify-center items-center gap-2 cursor-not-allowed">
                  <span className="material-symbols-outlined text-sm font-bold">done</span> SESSION ENDED
                </button>
              )}
            </div>
            
            <div className="mt-8 text-center text-[9px] font-bold tracking-wider text-[#8A938D]/60 max-w-[200px] uppercase leading-relaxed">
              Use the timer to accurately track interview length for analytics.
            </div>
          </div>
        </section>

        {/* Right Column: Evaluation Form */}
        <section className="w-full lg:w-[40%] flex flex-col gap-6 h-full pb-4">
          <div className="bg-[#101412] rounded-xl border border-[#1D2A22] flex-1 flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#1D2A22] bg-[#00FF66]/10">
              <h3 className="text-xs font-black text-[#00FF66] uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-base">fact_check</span>
                Interviewer Evaluation
              </h3>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              
              {/* Ratings */}
              <div className="space-y-4">
                <h4 className="text-[10px] text-[#F5F5F5] font-black uppercase tracking-widest border-b border-[#1D2A22] pb-2">Competency Ratings (1-5)</h4>
                
                {Object.entries(ratings).map(([key, value]) => {
                  const label = key.replace(/([A-Z])/g, ' $1').trim();
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#F5F5F5] font-semibold uppercase tracking-wider">{label}</span>
                        <span className="font-mono text-[#00FF66] font-bold text-sm">{value}</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" max="5" step="1"
                        value={value}
                        onChange={(e) => setRatings({...ratings, [key]: parseInt(e.target.value)})}
                        className="w-full h-1.5 bg-[#0B0D0C] rounded-lg appearance-none cursor-pointer accent-[#00FF66]"
                      />
                      <div className="flex justify-between text-[8px] font-bold text-[#8A938D] uppercase tracking-wider">
                        <span>Poor</span>
                        <span>Exceptional</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <h4 className="text-[10px] text-[#F5F5F5] font-black uppercase tracking-widest border-b border-[#1D2A22] pb-2">Interview Notes</h4>
                <div className="relative neon-border-focus rounded-lg">
                  <textarea 
                    rows={4}
                    placeholder="Enter detailed observation notes here..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 bg-[#0B0D0C] border border-[#1D2A22] rounded-lg text-xs text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-[#00FF66] resize-none transition-all custom-scrollbar placeholder:text-[#8A938D]/40"
                  ></textarea>
                </div>
              </div>

              {/* Final Decision */}
              <div className="space-y-2">
                <h4 className="text-[10px] text-[#F5F5F5] font-black uppercase tracking-widest border-b border-[#1D2A22] pb-2">Final Verdict</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <button 
                    onClick={() => setDecision("Approved")}
                    className={`py-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${decision === 'Approved' ? 'bg-[#00FF66]/10 border-[#00FF66] text-[#00FF66] shadow-[0_0_10px_rgba(0,255,102,0.15)] font-bold' : 'bg-[#0B0D0C] border-[#1D2A22] text-[#8A938D] hover:border-[#00FF66]/40 hover:text-[#00FF66]'}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">thumb_up</span>
                    <span className="text-[9px] font-black uppercase tracking-widest">Approved</span>
                  </button>
                  <button 
                    onClick={() => setDecision("Pending")}
                    className={`py-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${decision === 'Pending' ? 'bg-[#FFB020]/10 border-[#FFB020] text-[#FFB020] shadow-[0_0_10px_rgba(255,176,32,0.15)] font-bold' : 'bg-[#0B0D0C] border-[#1D2A22] text-[#8A938D] hover:border-[#FFB020]/40 hover:text-[#FFB020]'}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">hourglass_empty</span>
                    <span className="text-[9px] font-black uppercase tracking-widest">Pending</span>
                  </button>
                  <button 
                    onClick={() => setDecision("Discussion Needed")}
                    className={`py-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${decision === 'Discussion Needed' ? 'bg-[#FF4D4D]/10 border-[#FF4D4D] text-[#FF4D4D] shadow-[0_0_10px_rgba(255,77,77,0.15)] font-bold' : 'bg-[#0B0D0C] border-[#1D2A22] text-[#8A938D] hover:border-[#FF4D4D]/40 hover:text-[#FF4D4D]'}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">gavel</span>
                    <span className="text-[9px] font-black uppercase tracking-widest">Discuss</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Save Action */}
            <div className="p-4 border-t border-[#1D2A22] bg-[#0B0D0C]/65">
              <button 
                onClick={handleSave}
                disabled={timerStatus === 'running'}
                className="w-full py-3.5 bg-[#00FF66] text-[#050505] rounded-lg text-[10px] font-black uppercase tracking-wider flex justify-center items-center gap-2 hover:bg-[#00B84A] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,255,102,0.25)]"
              >
                <span className="material-symbols-outlined text-sm font-bold">save</span>
                SAVE EVALUATION
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Global Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl flex items-start gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 border bg-[#101412] backdrop-blur-xl ${toast.type === 'success' ? 'border-[#00FF66]/50 text-[#00FF66]' : 'border-[#FF4D4D]/50 text-[#FF4D4D]'}`}>
          <span className="material-symbols-outlined mt-0.5">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <div className="text-xs font-semibold whitespace-pre-line text-[#F5F5F5]">{toast.message}</div>
          <button onClick={() => setToast(null)} className="text-[#8A938D] hover:text-[#F5F5F5] ml-4 transition-colors">
             <span className="material-symbols-outlined text-sm font-bold">close</span>
          </button>
        </div>
      )}

      {/* Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .neon-border-focus:focus-within {
            border-color: #00FF66;
            box-shadow: 0 0 10px rgba(0, 255, 102, 0.2);
        }
        @keyframes scan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
        }
        .scanning::after {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 30px;
            background: linear-gradient(to bottom, transparent, rgba(0, 255, 102, 0.05), transparent);
            animation: scan 4s linear infinite;
            pointer-events: none;
        }
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
      `}} />
    </div>
  );
}
