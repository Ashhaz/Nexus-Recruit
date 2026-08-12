"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import CustomCursor from "@/components/ui/CustomCursor";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Ratings {
  technical: number;
  communication: number;
  confidence: number;
  leadership: number;
  teamwork: number;
}

interface ApplicantSummary {
  _id: string;
  name: string;
  rollNumber: string;
  department?: string;
}

interface DashboardSnapshot {
  interviewer: { name: string };
  room: { roomNumber: number };
  applicant: ApplicantSummary;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const RATING_LABELS: (keyof Ratings)[] = [
  "technical",
  "communication",
  "confidence",
  "leadership",
  "teamwork",
];

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

  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(true);
  const [snapshotError, setSnapshotError] = useState("");

  const [ratings, setRatings] = useState<Ratings>({
    technical: 5,
    communication: 5,
    confidence: 5,
    leadership: 5,
    teamwork: 5,
  });
  const [notes, setNotes] = useState("");
  const [decision, setDecision] = useState<"Approved" | "Pending" | "Discussion Needed" | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ── Load the applicant info for context ────────────────────────────────────

  const loadSnapshot = useCallback(async () => {
    if (!interviewerName) {
      setSnapshotError("No interviewer name in URL. Add ?name=YourName.");
      setLoadingSnapshot(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/interviewer/dashboard?name=${encodeURIComponent(interviewerName)}`
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load applicant");
      setSnapshot(json as DashboardSnapshot);
    } catch (e: any) {
      setSnapshotError(e.message);
    } finally {
      setLoadingSnapshot(false);
    }
  }, [interviewerName]);

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
      const res = await fetch("/api/interviewer/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantId: snapshot.applicant._id,
          roomNumber:  snapshot.room.roomNumber,
          ratings,
          notes,
          decision,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to submit evaluation");
      setSubmitted(true);
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

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
          {snapshot && (
            <p className="text-xs text-[#8A938D] font-semibold uppercase tracking-wider hidden sm:block">
              Evaluating: <span className="text-[#F5F5F5] font-black">{snapshot.applicant.name}</span>
            </p>
          )}
        </div>
      </header>

      {/* Canvas */}
      <div className="max-w-3xl mx-auto px-8 py-8 space-y-6">

        {/* Submitted state */}
        {submitted && (
          <div className="bg-[#101412] border border-[#1D2A22] rounded-xl p-10 flex flex-col items-center gap-5 text-center shadow-xl">
            <div className="w-16 h-16 rounded-full bg-[#00FF66]/10 flex items-center justify-center text-[#00FF66] border border-[#00FF66]/20">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>
            <h2 className="text-2xl font-black text-[#F5F5F5] uppercase tracking-wide">Evaluation Submitted</h2>
            <p className="text-xs text-[#8A938D] font-semibold uppercase tracking-wider max-w-xs">
              The evaluation for <strong>{snapshot?.applicant.name}</strong> has been saved successfully.
            </p>
            <button
              onClick={() => router.push(`/interviewer/workspace/select?room=${snapshot?.room.roomNumber || ""}`)}
              className="px-6 py-3 bg-[#00FF66] text-[#050505] hover:bg-[#00B84A] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(0,255,102,0.3)]"
            >
              Back to Room Selection
            </button>
          </div>
        )}

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
                <span className="material-symbols-outlined text-[#00FF66] text-lg font-bold">star</span>
                <h2 className="text-xs font-black text-[#F5F5F5] uppercase tracking-widest">Performance Ratings</h2>
                <span className="text-[10px] text-[#8A938D] font-bold uppercase tracking-wider ml-auto">Scale: 1 – 10</span>
              </div>
              <div className="space-y-6">
                {RATING_LABELS.map((key) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-[#8A938D] uppercase tracking-widest font-black capitalize">{key}</label>
                      <span className="text-sm font-mono font-bold text-[#00FF66] w-6 text-center">
                        {ratings[key]}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min={1}
                        max={10}
                        step={1}
                        value={ratings[key]}
                        onChange={(e) =>
                          setRatings((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                        }
                        className="w-full accent-[#00FF66] cursor-pointer"
                        style={{ accentColor: "#00FF66" }}
                      />
                      <div className="flex justify-between mt-1 px-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <span key={n} className={`text-[9px] font-mono ${ratings[key] >= n ? "text-[#00FF66] font-bold" : "text-[#8A938D]/30"}`}>
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Average indicator */}
              <div className="mt-8 pt-4 border-t border-[#1D2A22]/50 flex items-center justify-between">
                <span className="text-[10px] text-[#8A938D] font-black uppercase tracking-widest">Overall Average</span>
                <span className="text-xl font-bold font-mono text-[#00FF66]">
                  {(Object.values(ratings).reduce((a, b) => a + b, 0) / 5).toFixed(1)}
                  <span className="text-xs text-[#8A938D] font-normal"> / 10</span>
                </span>
              </div>
            </div>

            {/* ── Notes ───────────────────────────────────────────────────── */}
            <div className="bg-[#101412] border border-[#1D2A22] rounded-xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[#00FF66] text-lg font-bold">edit_note</span>
                <h2 className="text-xs font-black text-[#F5F5F5] uppercase tracking-widest">Interview Notes</h2>
                <span className="text-[9px] text-[#8A938D] font-bold uppercase tracking-wider ml-auto">Optional</span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="Add observations, strengths, concerns, or any noteworthy information about the candidate..."
                className="w-full bg-[#0B0D0C] border border-[#1D2A22] rounded-lg px-4 py-3 text-sm text-[#F5F5F5] placeholder:text-[#8A938D]/40 focus:ring-1 focus:ring-[#00FF66] focus:border-[#00FF66] transition-all outline-none resize-none"
              />
              <p className="text-[10px] text-[#8A938D] mt-2 text-right font-bold uppercase tracking-wider">{notes.length} characters</p>
            </div>

            {/* ── Final Decision ───────────────────────────────────────────── */}
            <div className="bg-[#101412] border border-[#1D2A22] rounded-xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[#00FF66] text-lg font-bold">gavel</span>
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
