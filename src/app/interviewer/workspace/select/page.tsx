"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface ApplicantData {
  _id: string;
  name: string;
  rollNumber: string;
  department?: string;
  year?: string;
}

export default function ApplicantSelectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomNumberStr = searchParams.get("room");
  const roomNumber = roomNumberStr ? Number(roomNumberStr) : null;

  const [interviewerName, setInterviewerName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ApplicantData[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRoomData = useCallback(async () => {
    if (!roomNumber) {
      setError("No room number provided. Add ?room=X to the URL.");
      setLoading(false);
      return;
    }
    try {
      const [resRoom, resAuth] = await Promise.all([
        fetch(`/api/interviewer/workspace?room=${roomNumber}`),
        fetch(`/api/auth/me`)
      ]);
      const jsonRoom = await resRoom.json();
      const jsonAuth = await resAuth.json();
      
      if (!jsonRoom.success) throw new Error(jsonRoom.error || "Failed to load room");
      if (!jsonAuth.success) throw new Error(jsonAuth.error || "Failed to authenticate session");
      
      setInterviewerName(jsonAuth.user.name);
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
        body: JSON.stringify({ roomNumber, applicantId: selectedApplicant._id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to start interview");
      
      router.push(`/interviewer/workspace/active?room=${roomNumber}`);
    } catch (e: any) {
      alert(e.message);
      setIsStarting(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-[#e1e2ed] font-body-md selection:bg-primary/30 selection:text-primary flex flex-col">
      <header className="w-full sticky top-0 z-50 border-b border-outline-variant/30 shadow-sm" style={{ background: "rgba(11,17,32,0.85)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center justify-between px-6 h-16 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[18px]">person_search</span>
            </div>
            <div>
              <p className="font-black text-primary text-sm tracking-tight">NEXUS</p>
              <p className="text-[9px] text-on-surface-variant uppercase tracking-widest">Select Applicant</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass-card px-4 py-1.5 rounded-full flex items-center gap-2 border border-primary/20">
              <span className="text-xs text-on-surface-variant uppercase">Room</span>
              <span className="text-sm font-semibold text-primary">{roomNumber}</span>
            </div>
            <div className="glass-card px-4 py-1.5 rounded-full flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">person</span>
              <span className="text-sm font-semibold text-on-surface">{interviewerName}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col items-center mt-8">
        
        {!selectedApplicant ? (
          <div className="w-full max-w-2xl glass-card rounded-3xl p-8 md:p-12 shadow-2xl border border-outline-variant/30">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-on-surface tracking-tight">Select Applicant</h2>
              <p className="text-on-surface-variant font-body-lg mt-3">Search for a waiting candidate to begin the interview process.</p>
            </div>

            <div className="w-full flex flex-col gap-3 text-left">
              <label className="text-sm font-label-md text-on-surface-variant uppercase tracking-wider pl-1">Search Database</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[24px]">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Name or Roll Number..."
                  className="w-full bg-surface-variant/30 border border-outline-variant/30 rounded-2xl pl-12 pr-10 py-5 text-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none text-on-surface placeholder:text-outline-variant/50"
                />
                {isSearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                )}
              </div>

              {/* Results list */}
              {searchResults.length > 0 && (
                <ul className="max-h-72 overflow-y-auto border border-outline-variant/20 rounded-2xl bg-surface-container divide-y divide-outline-variant/10 mt-4 shadow-xl">
                  {searchResults.map((a) => (
                    <li key={a._id}>
                      <button
                        onClick={() => {
                          setSelectedApplicant(a);
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="w-full text-left px-6 py-5 hover:bg-primary/10 transition-colors group flex items-center justify-between"
                      >
                        <div>
                          <p className="text-lg font-medium text-on-surface group-hover:text-primary transition-colors">{a.name}</p>
                          <p className="text-sm text-on-surface-variant mt-1 font-mono">{a.rollNumber}</p>
                          {(a.department || a.year) && (
                            <p className="text-xs text-outline-variant mt-2 font-label-sm uppercase tracking-wider">
                              {[a.department, a.year].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                        <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100">arrow_forward_ios</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* No results */}
              {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                <p className="text-sm text-on-surface-variant mt-4 text-center">No waiting applicants found for &ldquo;{searchQuery}&rdquo;</p>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-xl glass-card rounded-3xl p-8 md:p-12 shadow-[0_0_40px_rgba(76,215,246,0.1)] border border-primary/30 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 mb-6 shadow-inner">
              <span className="material-symbols-outlined text-5xl text-primary">person_check</span>
            </div>
            
            <h3 className="text-sm font-label-md text-on-surface-variant uppercase tracking-widest mb-2">Confirm Selection</h3>
            <h2 className="text-4xl font-black text-on-surface mb-2">{selectedApplicant.name}</h2>
            <p className="text-lg font-mono text-primary/80 mb-8">{selectedApplicant.rollNumber}</p>

            <div className="w-full grid grid-cols-2 gap-4 mb-10 text-left">
              <div className="bg-surface-variant/20 rounded-2xl p-4 border border-outline-variant/10">
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Room</p>
                <p className="text-lg font-semibold">{roomNumber}</p>
              </div>
              <div className="bg-surface-variant/20 rounded-2xl p-4 border border-outline-variant/10">
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Interviewer</p>
                <p className="text-lg font-semibold truncate">{interviewerName}</p>
              </div>
            </div>

            <button
              onClick={handleStartInterview}
              disabled={isStarting}
              className="w-full py-5 bg-primary text-on-primary hover:bg-primary/90 rounded-2xl font-label-lg text-lg transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(180,197,255,0.4)] disabled:opacity-50 disabled:shadow-none font-bold tracking-wider"
            >
              {isStarting ? (
                <>
                  <div className="w-6 h-6 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
                  STARTING...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">play_circle</span>
                  START INTERVIEW
                </>
              )}
            </button>

            <button
              onClick={() => setSelectedApplicant(null)}
              disabled={isStarting}
              className="mt-6 text-sm text-on-surface-variant hover:text-on-surface font-label-md transition-colors"
            >
              Cancel and search again
            </button>
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
