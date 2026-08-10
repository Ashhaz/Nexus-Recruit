"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

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
    <div className="min-h-screen flex flex-col bg-background text-on-background font-body-md selection:bg-primary/30 selection:text-primary">
      
      {/* Top Header */}
      <header className="w-full sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 shadow-sm h-16">
        <div className="flex items-center justify-between px-gutter h-full w-full mx-auto">
          <div className="flex items-center gap-md">
            <Link href="/admin/rooms" className="w-10 h-10 rounded-full hover:bg-surface-variant flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
            </Link>
            <div className="h-6 w-[1px] bg-outline-variant/30 mx-2"></div>
            <div>
              <h1 className="font-headline-md text-headline-md text-primary font-bold">Room {roomId} Workspace</h1>
              <p className="text-[10px] font-label-sm tracking-widest text-on-surface-variant uppercase">Active Session</p>
            </div>
          </div>
          
          <div className="flex items-center gap-md">
            <div className="px-3 py-1 bg-error/10 text-error rounded-full border border-error/20 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
              <span className="text-xs font-label-sm uppercase tracking-wider font-bold">Live</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-gutter pt-8 overflow-hidden h-[calc(100vh-64px)] flex flex-col lg:flex-row gap-lg">
        
        {/* Left Column: Applicant Data */}
        <section className="w-full lg:w-[35%] flex flex-col gap-md overflow-y-auto pr-2 custom-scrollbar">
          
          <div className="glass-card rounded-xl p-md scanning border border-outline-variant/20 relative overflow-hidden">
            <div className="flex items-start gap-md relative z-10">
              <div className="w-20 h-20 rounded-xl bg-surface-variant border border-outline-variant/30 flex flex-shrink-0 items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-primary/50">person</span>
              </div>
              <div>
                <h2 className="font-headline-md text-headline-md font-bold text-on-surface">{MOCK_APPLICANT.name}</h2>
                <p className="text-secondary font-label-md mb-2">{MOCK_APPLICANT.rollNo}</p>
                <div className="space-y-1">
                  <div className="flex gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">school</span>
                    {MOCK_APPLICANT.department}, {MOCK_APPLICANT.year}
                  </div>
                  <div className="flex gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">group</span>
                    {MOCK_APPLICANT.teamApplied}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl border border-outline-variant/20 flex-1 flex flex-col overflow-hidden">
            <div className="p-md border-b border-outline-variant/20 bg-surface-container-low/50">
              <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">description</span>
                Application Responses
              </h3>
            </div>
            
            <div className="p-md overflow-y-auto space-y-md custom-scrollbar">
              {Object.entries(MOCK_APPLICANT.responses).map(([question, answer], index) => {
                if (answer.length > 50) {
                  return (
                    <div key={index} className="space-y-xs">
                      <label className="text-[10px] text-secondary font-label-sm uppercase tracking-wider">{question}</label>
                      <p className="p-3 bg-surface-container rounded-lg border-l-2 border-primary text-sm text-on-surface leading-relaxed">
                        {answer}
                      </p>
                    </div>
                  );
                }
                return null;
              })}
              
              <div className="border border-outline-variant/20 rounded-lg overflow-hidden bg-surface-container mt-4">
                <div className="divide-y divide-outline-variant/20">
                  {Object.entries(MOCK_APPLICANT.responses).map(([question, answer], index) => {
                    if (answer.length <= 50) {
                      return (
                        <div key={index} className="grid grid-cols-2 p-3 hover:bg-surface-variant/20">
                          <span className="text-xs text-on-surface-variant">{question}</span>
                          <span className="text-sm font-medium text-on-surface text-right">{answer}</span>
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
        <section className="w-full lg:w-[25%] flex flex-col gap-md">
          <div className="glass-card rounded-xl border border-outline-variant/20 p-xl flex flex-col items-center justify-center flex-1 shadow-[inset_0_0_40px_rgba(180,197,255,0.05)]">
            <h3 className="text-sm text-on-surface-variant font-label-sm uppercase tracking-widest mb-6">Session Timer</h3>
            
            <div className={`font-mono text-7xl font-bold tracking-tighter tabular-nums mb-8 ${timerStatus === 'running' ? 'text-primary drop-shadow-[0_0_15px_rgba(180,197,255,0.5)]' : 'text-on-surface'}`}>
              {formatTime(elapsedTime)}
            </div>

            <div className="grid grid-cols-2 gap-md w-full">
              {timerStatus === 'idle' && (
                <button onClick={() => setTimerStatus('running')} className="col-span-2 py-3 bg-primary text-on-primary rounded-xl font-label-md flex justify-center items-center gap-2 hover:bg-primary/90 transition-all active:scale-95 shadow-[0_0_15px_rgba(180,197,255,0.3)]">
                  <span className="material-symbols-outlined">play_arrow</span> START
                </button>
              )}
              
              {timerStatus === 'running' && (
                <>
                  <button onClick={() => setTimerStatus('paused')} className="py-3 bg-surface-variant text-on-surface rounded-xl font-label-md flex justify-center items-center gap-2 hover:bg-surface-variant/80 transition-all active:scale-95">
                    <span className="material-symbols-outlined">pause</span> PAUSE
                  </button>
                  <button onClick={() => setTimerStatus('stopped')} className="py-3 bg-error text-on-error rounded-xl font-label-md flex justify-center items-center gap-2 hover:bg-error/90 transition-all active:scale-95 shadow-[0_0_15px_rgba(255,180,171,0.3)]">
                    <span className="material-symbols-outlined">stop</span> STOP
                  </button>
                </>
              )}
              
              {timerStatus === 'paused' && (
                <>
                  <button onClick={() => setTimerStatus('running')} className="py-3 bg-primary text-on-primary rounded-xl font-label-md flex justify-center items-center gap-2 hover:bg-primary/90 transition-all active:scale-95 shadow-[0_0_15px_rgba(180,197,255,0.3)]">
                    <span className="material-symbols-outlined">play_arrow</span> RESUME
                  </button>
                  <button onClick={() => setTimerStatus('stopped')} className="py-3 bg-error text-on-error rounded-xl font-label-md flex justify-center items-center gap-2 hover:bg-error/90 transition-all active:scale-95 shadow-[0_0_15px_rgba(255,180,171,0.3)]">
                    <span className="material-symbols-outlined">stop</span> STOP
                  </button>
                </>
              )}

              {timerStatus === 'stopped' && (
                <button disabled className="col-span-2 py-3 bg-surface-container opacity-50 text-on-surface-variant rounded-xl font-label-md flex justify-center items-center gap-2 cursor-not-allowed">
                  <span className="material-symbols-outlined">done</span> SESSION ENDED
                </button>
              )}
            </div>
            
            <div className="mt-8 text-center text-xs text-on-surface-variant/50 max-w-[200px]">
              Use the timer to accurately track interview length for analytics.
            </div>
          </div>
        </section>

        {/* Right Column: Evaluation Form */}
        <section className="w-full lg:w-[40%] flex flex-col gap-md h-full pb-4">
          <div className="glass-card rounded-xl border border-outline-variant/20 flex-1 flex flex-col overflow-hidden">
            <div className="p-md border-b border-outline-variant/20 bg-primary/10">
              <h3 className="font-headline-sm text-headline-sm text-primary flex items-center gap-2">
                <span className="material-symbols-outlined">fact_check</span>
                Interviewer Evaluation
              </h3>
            </div>
            
            <div className="p-md overflow-y-auto space-y-xl flex-1 custom-scrollbar">
              
              {/* Ratings */}
              <div className="space-y-md">
                <h4 className="text-xs text-on-surface-variant font-label-sm uppercase tracking-widest border-b border-outline-variant/20 pb-2">Competency Ratings (1-5)</h4>
                
                {Object.entries(ratings).map(([key, value]) => {
                  const label = key.replace(/([A-Z])/g, ' $1').trim();
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-on-surface">{label}</span>
                        <span className="font-mono text-primary font-bold">{value}</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" max="5" step="1"
                        value={value}
                        onChange={(e) => setRatings({...ratings, [key]: parseInt(e.target.value)})}
                        className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-[10px] text-on-surface-variant">
                        <span>Poor</span>
                        <span>Exceptional</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Notes */}
              <div className="space-y-sm">
                <h4 className="text-xs text-on-surface-variant font-label-sm uppercase tracking-widest border-b border-outline-variant/20 pb-2">Interview Notes</h4>
                <div className="relative neon-border-focus rounded-xl">
                  <textarea 
                    rows={4}
                    placeholder="Enter detailed observation notes here..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary resize-none transition-all custom-scrollbar"
                  ></textarea>
                </div>
              </div>

              {/* Final Decision */}
              <div className="space-y-sm">
                <h4 className="text-xs text-on-surface-variant font-label-sm uppercase tracking-widest border-b border-outline-variant/20 pb-2">Final Verdict</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm pt-2">
                  <button 
                    onClick={() => setDecision("Approved")}
                    className={`py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${decision === 'Approved' ? 'bg-secondary/20 border-secondary text-secondary shadow-[0_0_10px_rgba(157,236,192,0.2)]' : 'bg-surface-variant/20 border-outline-variant/20 text-on-surface-variant hover:border-secondary/50 hover:text-secondary'}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">thumb_up</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Approved</span>
                  </button>
                  <button 
                    onClick={() => setDecision("Pending")}
                    className={`py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${decision === 'Pending' ? 'bg-tertiary/20 border-tertiary text-tertiary shadow-[0_0_10px_rgba(255,200,100,0.2)]' : 'bg-surface-variant/20 border-outline-variant/20 text-on-surface-variant hover:border-tertiary/50 hover:text-tertiary'}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">hourglass_empty</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Pending</span>
                  </button>
                  <button 
                    onClick={() => setDecision("Discussion Needed")}
                    className={`py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${decision === 'Discussion Needed' ? 'bg-error/20 border-error text-error shadow-[0_0_10px_rgba(255,180,171,0.2)]' : 'bg-surface-variant/20 border-outline-variant/20 text-on-surface-variant hover:border-error/50 hover:text-error'}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">gavel</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Discuss</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Save Action */}
            <div className="p-md border-t border-outline-variant/20 bg-surface-container">
              <button 
                onClick={handleSave}
                disabled={timerStatus === 'running'}
                className="w-full py-4 bg-primary text-on-primary rounded-xl font-label-lg font-bold flex justify-center items-center gap-2 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(180,197,255,0.2)]"
              >
                <span className="material-symbols-outlined">save</span>
                SAVE EVALUATION
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Global Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 p-md rounded-xl flex items-start gap-md shadow-2xl animate-in fade-in slide-in-from-bottom-4 border bg-surface-container backdrop-blur-xl ${toast.type === 'success' ? 'border-secondary/50 text-secondary' : 'border-error/50 text-error'}`}>
          <span className="material-symbols-outlined mt-1">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <div className="font-body-md whitespace-pre-line text-on-surface">{toast.message}</div>
          <button onClick={() => setToast(null)} className="text-on-surface-variant hover:text-on-surface ml-4">
             <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .glass-card {
            background: rgba(17, 24, 39, 0.7);
            backdrop-filter: blur(12px);
        }
        .neon-border-focus:focus-within {
            border-color: #b4c5ff;
            box-shadow: 0 0 10px rgba(180, 197, 255, 0.2);
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
            background: linear-gradient(to bottom, transparent, rgba(76, 215, 246, 0.1), transparent);
            animation: scan 4s linear infinite;
            pointer-events: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}} />
    </div>
  );
}
