"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";

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
  Approved:            "border-secondary text-secondary bg-secondary/10",
  Pending:             "border-yellow-400 text-yellow-400 bg-yellow-400/10",
  "Discussion Needed": "border-error text-error bg-error/10",
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
      className="min-h-screen bg-background text-[#e1e2ed] font-body-md selection:bg-primary/30 selection:text-primary"
    >
      {/* Top bar */}
      <header
        className="w-full sticky top-0 z-50 border-b border-outline-variant/30 shadow-sm"
        style={{ background: "rgba(11,17,32,0.85)", backdropFilter: "blur(20px)" }}
      >
        <div className="flex items-center justify-between px-6 h-16 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/30 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[18px]">terminal</span>
            </div>
            <div>
              <p className="font-black text-primary text-sm tracking-tight">NEXUS</p>
              <p className="text-[9px] text-on-surface-variant uppercase tracking-widest">Evaluation Form</p>
            </div>
          </div>
          {snapshot && (
            <p className="text-sm text-on-surface-variant hidden sm:block">
              Evaluating: <span className="text-on-surface font-medium">{snapshot.applicant.name}</span>
            </p>
          )}
        </div>
      </header>

      {/* Canvas */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Submitted state */}
        {submitted && (
          <div className="glass-card rounded-2xl p-10 flex flex-col items-center gap-5 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-[36px]">check_circle</span>
            </div>
            <h2 className="font-headline-md text-on-surface">Evaluation Submitted</h2>
            <p className="text-on-surface-variant text-sm max-w-xs">
              The evaluation for <strong>{snapshot?.applicant.name}</strong> has been saved successfully.
            </p>
            <button
              onClick={() => router.push(`/interviewer/dashboard?name=${encodeURIComponent(interviewerName)}`)}
              className="px-6 py-3 bg-primary text-on-primary rounded-xl font-label-md text-sm hover:bg-primary/90 transition-colors shadow-[0_0_12px_rgba(180,197,255,0.3)]"
            >
              Back to Dashboard
            </button>
          </div>
        )}

        {/* Error loading snapshot */}
        {!submitted && snapshotError && (
          <div className="bg-error/10 border border-error/30 text-error rounded-xl p-5 flex items-start gap-3">
            <span className="material-symbols-outlined mt-0.5 flex-shrink-0">error</span>
            <p>{snapshotError}</p>
          </div>
        )}

        {!submitted && !snapshotError && (
          <>
            {/* Applicant context banner */}
            <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-[24px]">person</span>
              </div>
              {loadingSnapshot ? (
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-surface-variant/40 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-surface-variant/30 rounded animate-pulse w-1/4" />
                </div>
              ) : snapshot ? (
                <div>
                  <p className="text-base font-bold text-on-surface">{snapshot.applicant.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {snapshot.applicant.rollNumber}
                    {snapshot.applicant.department ? ` · ${snapshot.applicant.department}` : ""}
                    {" · "}Room {snapshot.room.roomNumber}
                  </p>
                </div>
              ) : null}
            </div>

            {/* ── Ratings ─────────────────────────────────────────────────── */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-primary text-[20px]">star</span>
                <h2 className="text-sm font-semibold text-on-surface uppercase tracking-wider">Performance Ratings</h2>
                <span className="text-xs text-on-surface-variant ml-auto">Scale: 1 – 10</span>
              </div>
              <div className="space-y-5">
                {RATING_LABELS.map((key) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-on-surface capitalize font-medium">{key}</label>
                      <span className="text-sm font-mono font-bold text-primary w-6 text-center">
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
                        className="w-full accent-primary"
                        style={{ accentColor: "#b4c5ff" }}
                      />
                      <div className="flex justify-between mt-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <span key={n} className={`text-[9px] ${ratings[key] >= n ? "text-primary" : "text-on-surface-variant/40"}`}>
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Average indicator */}
              <div className="mt-6 pt-4 border-t border-outline-variant/15 flex items-center justify-between">
                <span className="text-xs text-on-surface-variant uppercase tracking-wider">Overall Average</span>
                <span className="text-xl font-bold font-mono text-primary">
                  {(Object.values(ratings).reduce((a, b) => a + b, 0) / 5).toFixed(1)}
                  <span className="text-sm text-on-surface-variant font-normal"> / 10</span>
                </span>
              </div>
            </div>

            {/* ── Notes ───────────────────────────────────────────────────── */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-secondary text-[20px]">edit_note</span>
                <h2 className="text-sm font-semibold text-on-surface uppercase tracking-wider">Interview Notes</h2>
                <span className="text-xs text-on-surface-variant ml-auto">Optional</span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="Add observations, strengths, concerns, or any noteworthy information about the candidate..."
                className="w-full bg-surface-variant/20 border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline-variant focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none resize-none"
              />
              <p className="text-xs text-on-surface-variant mt-2 text-right">{notes.length} characters</p>
            </div>

            {/* ── Final Decision ───────────────────────────────────────────── */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary text-[20px]">gavel</span>
                <h2 className="text-sm font-semibold text-on-surface uppercase tracking-wider">Final Decision</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {DECISION_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setDecision(opt)}
                    className={`py-3 px-4 rounded-xl border-2 text-sm font-label-md transition-all ${
                      decision === opt
                        ? DECISION_COLORS[opt]
                        : "border-outline-variant/30 text-on-surface-variant hover:border-outline-variant/60 hover:text-on-surface"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Submit ───────────────────────────────────────────────────── */}
            {submitError && (
              <div className="bg-error/10 border border-error/30 text-error rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {submitError}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !decision || loadingSnapshot}
              className="w-full py-4 bg-primary text-on-primary hover:bg-primary/90 rounded-xl font-label-md text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(180,197,255,0.35)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  Submitting Evaluation...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  Submit Evaluation
                </>
              )}
            </button>
          </>
        )}

      </div>

      {/* Global CSS */}
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
