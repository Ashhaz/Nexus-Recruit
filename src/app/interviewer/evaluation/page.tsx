"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import CustomCursor from "@/components/ui/CustomCursor";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EvaluationCriterion {
  id: string;
  name: string;
  maxScore: number;
}

interface ApplicantSummary {
  _id: string;
  name: string;
  rollNumber: string;
  department?: string;
}

interface DashboardSnapshot {
  activeEvent?: { _id: string; name: string } | null;
  interviewer: { name: string };
  room: { roomNumber: number };
  applicant: ApplicantSummary;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const DECISION_OPTIONS: Array<"Approved" | "Pending" | "Discussion Needed"> = [
  "Approved",
  "Pending",
  "Discussion Needed",
];

const DECISION_COLORS: Record<string, string> = {
  Approved:            "border-[#00FF66] text-[#00FF66] bg-[#00FF66]/10 shadow-[0_0_12px_rgba(0,255,102,0.1)]",
  Pending:             "border-[#FFB020] text-[#FFB020] bg-[#FFB020]/10 shadow-[0_0_12px_rgba(255,176,32,0.1)]",
  "Discussion Needed": "border-[#FF4D4D] text-[#FF4D4D] bg-[#FF4D4D]/10 shadow-[0_0_12px_rgba(255,77,77,0.1)]",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function InterviewerEvaluationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const interviewerName = searchParams.get("name") ?? "";
  const roomParam = searchParams.get("room") ?? "";
  const applicantIdParam = searchParams.get("applicantId") ?? "";

  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(true);
  const [snapshotError, setSnapshotError] = useState("");

  const [criteria, setCriteria] = useState<EvaluationCriterion[]>([
    { id: "technical", name: "Technical", maxScore: 10 },
    { id: "communication", name: "Communication", maxScore: 10 },
    { id: "confidence", name: "Confidence", maxScore: 10 },
    { id: "leadership", name: "Leadership", maxScore: 10 },
    { id: "teamwork", name: "Teamwork", maxScore: 10 },
  ]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [loadingCriteria, setLoadingCriteria] = useState(true);

  const [notes, setNotes] = useState("");
  const [decision, setDecision] = useState<"Approved" | "Pending" | "Discussion Needed" | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ── Fetch dynamic global evaluation criteria ──────────────────────────────

  useEffect(() => {
    let isMounted = true;
    const fetchCriteria = async () => {
      try {
        const res = await fetch("/api/evaluation-config");
        const json = await res.json();
        if (json.success && Array.isArray(json.criteria) && json.criteria.length > 0) {
          if (isMounted) {
            setCriteria(json.criteria);
            setRatings((prev) => {
              const updated = { ...prev };
              json.criteria.forEach((c: EvaluationCriterion) => {
                if (updated[c.id] === undefined) {
                  updated[c.id] = Math.round(c.maxScore / 2);
                }
              });
              return updated;
            });
          }
        }
      } catch (err) {
        console.error("Failed to load evaluation criteria:", err);
      } finally {
        if (isMounted) setLoadingCriteria(false);
      }
    };
    fetchCriteria();
    return () => {
      isMounted = false;
    };
  }, []);

  // ── Load the applicant info for context ────────────────────────────────────

  const loadSnapshot = useCallback(async () => {
    let cachedNotes = "";
    if (typeof window !== "undefined") {
      try {
        cachedNotes =
          (applicantIdParam ? sessionStorage.getItem(`nexus_interview_notes_${applicantIdParam}`) : null) ||
          (roomParam ? sessionStorage.getItem(`nexus_interview_notes_${roomParam}`) : null) ||
          "";
        if (cachedNotes) {
          setNotes(cachedNotes);
        }
      } catch (_) {}
    }

    try {
      // 1. Try fetching via workspace room if room number is available
      if (roomParam) {
        const wsRes = await fetch(`/api/interviewer/workspace?room=${roomParam}`);
        const wsJson = await wsRes.json();
        if (wsJson.success && wsJson.room && wsJson.applicant) {
          setSnapshot({
            activeEvent: wsJson.activeEvent,
            interviewer: { name: wsJson.room.interviewer || interviewerName },
            room: { roomNumber: wsJson.room.roomNumber },
            applicant: {
              _id: wsJson.applicant._id,
              name: wsJson.applicant.name,
              rollNumber: wsJson.applicant.rollNumber,
              department: wsJson.applicant.department,
            },
          });
          if (wsJson.applicant.interviewNotes) {
            setNotes(wsJson.applicant.interviewNotes);
          } else if (cachedNotes) {
            setNotes(cachedNotes);
          }
          setLoadingSnapshot(false);
          return;
        }
      }

      // 2. Try fetching via interviewer dashboard
      if (interviewerName) {
        const res = await fetch(
          `/api/interviewer/dashboard?name=${encodeURIComponent(interviewerName)}`
        );
        const json = await res.json();
        if (json.success && json.applicant) {
          setSnapshot(json as DashboardSnapshot);
          if (json.applicant.interviewNotes) {
            setNotes(json.applicant.interviewNotes);
          } else if (cachedNotes) {
            setNotes(cachedNotes);
          }
          setLoadingSnapshot(false);
          return;
        }
      }

      // 3. Fallback: match by applicantId across applicants
      if (applicantIdParam) {
        const appRes = await fetch(`/api/dashboard/applicants?eventId=all`);
        const appJson = await appRes.json();
        if (appJson.success && Array.isArray(appJson.applicants)) {
          const matched = appJson.applicants.find((a: any) => a._id === applicantIdParam);
          if (matched) {
            setSnapshot({
              activeEvent: null,
              interviewer: { name: matched.assignedInterviewer || interviewerName || "Interviewer" },
              room: { roomNumber: Number(roomParam) || matched.assignedRoom || 1 },
              applicant: {
                _id: matched._id,
                name: matched.name,
                rollNumber: matched.rollNumber,
                department: matched.department,
              },
            });
            if (matched.interviewNotes) {
              setNotes(matched.interviewNotes);
            } else if (cachedNotes) {
              setNotes(cachedNotes);
            }
            setLoadingSnapshot(false);
            return;
          }
        }
      }

      if (!interviewerName && !roomParam && !applicantIdParam) {
        throw new Error("No room, interviewer name, or applicantId provided in URL.");
      }

      throw new Error("Could not find candidate information. Please ensure room is active.");
    } catch (e: any) {
      setSnapshotError(e.message);
    } finally {
      setLoadingSnapshot(false);
    }
  }, [applicantIdParam, roomParam, interviewerName]);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  // ── Submit evaluation ──────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!decision) {
      setSubmitError("Please select a final decision before submitting.");
      return;
    }
    if (!snapshot) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const criteriaSnapshot = criteria.map((c) => ({
        id: c.id,
        label: c.name,
        score: ratings[c.id] !== undefined ? ratings[c.id] : Math.round((c.maxScore || 10) / 2),
        maxScore: c.maxScore || 10,
      }));

      const res = await fetch("/api/interviewer/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantId: snapshot.applicant._id,
          roomNumber:  snapshot.room.roomNumber,
          ratings,
          criteriaSnapshot,
          notes,
          decision,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to submit evaluation");

      // Clean up cached notes
      if (typeof window !== "undefined") {
        try {
          if (roomParam) sessionStorage.removeItem(`nexus_interview_notes_${roomParam}`);
          if (snapshot.room.roomNumber) sessionStorage.removeItem(`nexus_interview_notes_${snapshot.room.roomNumber}`);
          if (snapshot.applicant._id) sessionStorage.removeItem(`nexus_interview_notes_${snapshot.applicant._id}`);
          if (applicantIdParam) sessionStorage.removeItem(`nexus_interview_notes_${applicantIdParam}`);
        } catch (_) {}
      }

      setSubmitted(true);
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#F5F5F5] font-body-md selection:bg-[#00FF66]/30 selection:text-[#00FF66] flex flex-col">
        <CustomCursor />
        
        <header className="w-full sticky top-0 z-50 border-b border-[#1D2A22] bg-[#050505]/80 backdrop-blur-xl shadow-sm">
          <div className="flex items-center justify-between px-8 h-16 max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#00FF66] flex items-center justify-center text-[#050505] shadow-[0_0_12px_rgba(0,255,102,0.4)]">
                <span className="material-symbols-outlined text-[18px] font-bold">terminal</span>
              </div>
              <div>
                <p className="font-black text-[#F5F5F5] text-sm tracking-wide uppercase">NEXUS</p>
                <p className="text-[9px] text-[#8A938D] font-bold uppercase tracking-widest">Evaluation Form</p>
              </div>
            </div>
          </div>
        </header>

        <main className="w-full flex-1 flex items-center justify-center py-10 px-4">
          <section className="w-full max-w-2xl mx-auto">
            <div className="w-full bg-[#101412] border border-[#1D2A22] rounded-xl p-10 text-center shadow-xl">
              <div className="w-16 h-16 rounded-full bg-[#00FF66]/10 flex items-center justify-center text-[#00FF66] border border-[#00FF66]/20 mx-auto mb-6">
                <span className="material-symbols-outlined text-[36px]">check_circle</span>
              </div>
              <h2 className="text-2xl font-black text-[#F5F5F5] uppercase tracking-wide mb-4">Evaluation Submitted</h2>
              <p className="w-full max-w-full min-w-0 text-center text-sm text-[#8A938D] font-semibold uppercase tracking-wider mx-auto mb-8 leading-relaxed">
                The evaluation for <strong>{snapshot?.applicant?.name || "the candidate"}</strong> has been saved successfully.
              </p>
              <button
                type="button"
                onClick={() => router.push(`/interviewer/workspace/select?room=${snapshot?.room?.roomNumber || ""}`)}
                className="w-full py-4 bg-[#00FF66] text-[#050505] hover:bg-[#00B84A] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(0,255,102,0.3)] block"
              >
                Back to Room Selection
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#050505] text-[#F5F5F5] font-body-md selection:bg-[#00FF66]/30 selection:text-[#00FF66]"
    >
      <CustomCursor />
      
      {/* Top bar */}
      <header
        className="w-full sticky top-0 z-50 border-b border-[#1D2A22] bg-[#050505]/80 backdrop-blur-xl shadow-sm"
      >
        <div className="flex items-center justify-between px-8 h-16 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full text-[#8A938D] hover:text-[#00FF66] hover:bg-[#101412] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
            </button>
            <div className="w-8 h-8 rounded-lg bg-[#00FF66] flex items-center justify-center text-[#050505] shadow-[0_0_12px_rgba(0,255,102,0.4)]">
              <span className="material-symbols-outlined text-[18px] font-bold">terminal</span>
            </div>
            <div>
              <p className="font-black text-[#F5F5F5] text-sm tracking-wide uppercase">NEXUS</p>
              <p className="text-[9px] text-[#8A938D] font-bold uppercase tracking-widest">Evaluation Form</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {snapshot?.activeEvent && (
              <div className="bg-[#101412] px-3.5 py-1.5 rounded-full flex items-center gap-2 border border-[#00FF66]/30 shadow-[0_0_12px_rgba(0,255,102,0.1)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
                <span className="text-[9px] font-black text-[#8A938D] uppercase tracking-wider hidden sm:inline">Event:</span>
                <span className="text-xs font-bold text-[#F5F5F5] truncate max-w-[140px] sm:max-w-[180px]">{snapshot.activeEvent.name}</span>
              </div>
            )}
            {snapshot && (
              <p className="text-xs text-[#8A938D] font-semibold uppercase tracking-wider hidden sm:block">
                Evaluating: <span className="text-[#F5F5F5] font-black">{snapshot.applicant.name}</span>
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Canvas */}
      <div className="max-w-3xl mx-auto px-8 py-8 space-y-6">


        {/* Error loading snapshot */}
        {!submitted && snapshotError && (
          <div className="bg-[#FF4D4D]/10 border border-[#FF4D4D]/20 text-[#FF4D4D] rounded-xl p-5 flex items-start gap-3 shadow-md">
            <span className="material-symbols-outlined mt-0.5 flex-shrink-0">error</span>
            <p className="text-xs font-bold uppercase tracking-wider">{snapshotError}</p>
          </div>
        )}

        {!submitted && !snapshotError && (
          <>
            {/* Applicant context banner */}
            <div className="bg-[#101412] border border-[#1D2A22] rounded-xl p-5 flex items-center gap-4 shadow-xl">
              <div className="w-12 h-12 rounded-lg bg-[#00FF66]/10 border border-[#00FF66]/20 flex items-center justify-center flex-shrink-0 text-[#00FF66]">
                <span className="material-symbols-outlined text-[24px]">person</span>
              </div>
              {loadingSnapshot ? (
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-[#0B0D0C]/40 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-[#0B0D0C]/30 rounded animate-pulse w-1/4" />
                </div>
              ) : snapshot ? (
                <div>
                  <p className="text-base font-black text-[#F5F5F5] uppercase tracking-wide">{snapshot.applicant.name}</p>
                  <p className="text-xs text-[#8A938D] font-semibold mt-1">
                    {snapshot.applicant.rollNumber}
                    {snapshot.applicant.department ? ` · ${snapshot.applicant.department}` : ""}
                    {" · "}Room {snapshot.room.roomNumber}
                  </p>
                </div>
              ) : null}
            </div>

            {/* ── Ratings ─────────────────────────────────────────────────── */}
            <div className="bg-[#101412] border border-[#1D2A22] rounded-xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-6 border-b border-[#1D2A22]/50 pb-3">
                <h2 className="text-xs font-black text-[#F5F5F5] uppercase tracking-widest">Performance Ratings</h2>
                <span className="text-[10px] text-[#8A938D] font-bold uppercase tracking-wider ml-auto">
                  {criteria.length} Criteria Configured
                </span>
              </div>

              {loadingCriteria ? (
                <div className="space-y-4 py-4">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} className="h-12 bg-[#0B0D0C]/40 border border-[#1D2A22] rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {criteria.map((crit) => {
                    const max = crit.maxScore || 10;
                    const currentVal = ratings[crit.id] !== undefined ? ratings[crit.id] : Math.round(max / 2);
                    const ticks = Array.from({ length: Math.min(max + 1, 11) }, (_, i) => Math.round((i / Math.min(max, 10)) * max));
                    const uniqueTicks = Array.from(new Set(ticks));

                    return (
                      <div key={crit.id}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs text-[#8A938D] uppercase tracking-widest font-black">
                            {crit.name}
                          </label>
                          <span className="text-sm font-mono font-bold text-[#00FF66] text-right">
                            {currentVal} <span className="text-[10px] text-[#8A938D] font-normal">/ {max}</span>
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="range"
                            min={0}
                            max={max}
                            step={1}
                            value={currentVal}
                            onChange={(e) => {
                              const val = Math.min(max, Math.max(0, Number(e.target.value)));
                              setRatings((prev) => ({ ...prev, [crit.id]: val }));
                            }}
                            className="w-full accent-[#00FF66] cursor-pointer"
                            style={{ accentColor: "#00FF66" }}
                          />
                          <div className="flex justify-between mt-1 px-1">
                            {uniqueTicks.map((n) => (
                              <span
                                key={n}
                                className={`text-[9px] font-mono ${
                                  currentVal >= n ? "text-[#00FF66] font-bold" : "text-[#8A938D]/30"
                                }`}
                              >
                                {n}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Average indicator */}
              {(() => {
                const totalMax = criteria.reduce((sum, c) => sum + (c.maxScore || 10), 0);
                const totalScore = criteria.reduce((sum, c) => sum + (ratings[c.id] ?? Math.round((c.maxScore || 10) / 2)), 0);
                const normalizedAverage = totalMax > 0 ? ((totalScore / totalMax) * 10).toFixed(1) : "0.0";

                return (
                  <div className="mt-8 pt-4 border-t border-[#1D2A22]/50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#8A938D] font-black uppercase tracking-widest block">Overall Average</span>
                      <span className="text-[9px] text-[#8A938D]/60 font-mono">
                        Total: {totalScore} / {totalMax}
                      </span>
                    </div>
                    <span className="text-xl font-bold font-mono text-[#00FF66]">
                      {normalizedAverage}
                      <span className="text-xs text-[#8A938D] font-normal"> / 10</span>
                    </span>
                  </div>
                );
              })()}
            </div>


            {/* ── Interview Observations & Notes ─────────────────────────── */}
            <div className="bg-[#101412] border border-[#1D2A22] rounded-xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-3 border-b border-[#1D2A22]/50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00FF66] text-base">rate_review</span>
                  <h2 className="text-xs font-black text-[#F5F5F5] uppercase tracking-widest">
                    Interview Observations &amp; Notes
                  </h2>
                </div>
                <span className="text-[10px] text-[#8A938D] font-bold uppercase tracking-wider">
                  Persistent Record
                </span>
              </div>
              <p className="text-[11px] text-[#8A938D] mb-3">
                Review or record observations, technical answers, candidate strengths, and recommendations.
              </p>
              <textarea
                value={notes}
                onChange={(e) => {
                  const val = e.target.value;
                  setNotes(val);
                  if (typeof window !== "undefined") {
                    try {
                      if (roomParam) sessionStorage.setItem(`nexus_interview_notes_${roomParam}`, val);
                      if (snapshot?.applicant?._id) sessionStorage.setItem(`nexus_interview_notes_${snapshot.applicant._id}`, val);
                      if (applicantIdParam) sessionStorage.setItem(`nexus_interview_notes_${applicantIdParam}`, val);
                    } catch (_) {}
                  }
                }}
                placeholder="Enter interview notes, key observations, candidate strengths..."
                rows={4}
                className="w-full bg-[#0B0D0C] border border-[#1D2A22] rounded-lg p-3 text-xs text-[#F5F5F5] placeholder:text-[#8A938D]/40 focus:ring-1 focus:ring-[#00FF66] focus:border-[#00FF66] transition-all outline-none resize-y"
              />
            </div>

            {/* ── Final Decision ───────────────────────────────────────────── */}
            <div className="bg-[#101412] border border-[#1D2A22] rounded-xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xs font-black text-[#F5F5F5] uppercase tracking-widest">Final Decision</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {DECISION_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setDecision(opt)}
                    className={`py-3 px-4 rounded-lg border-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                      decision === opt
                        ? DECISION_COLORS[opt]
                        : "border-[#1D2A22] text-[#8A938D] hover:border-[#8A938D]/50 hover:text-[#F5F5F5] bg-transparent"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Submit ───────────────────────────────────────────────────── */}
            {submitError && (
              <div className="bg-[#FF4D4D]/10 border border-[#FF4D4D]/20 text-[#FF4D4D] rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {submitError}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !decision || loadingSnapshot}
              className="w-full py-4 bg-[#00FF66] text-[#050505] hover:bg-[#00B84A] rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,102,0.35)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#050505]/30 border-t-[#050505] rounded-full animate-spin" />
                  Submitting Evaluation...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px] font-bold">send</span>
                  Submit Evaluation
                </>
              )}
            </button>
          </>
        )}

      </div>
    </div>
  );
}
