"use client";

import React, { useState } from "react";
import { EvaluationPathId, CriterionEvaluationItem, FinalScoreResult } from "@/lib/dimensions";

export type FinalDecision = "Approved" | "Pending" | "Discussion Needed";

interface EndInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    decision: FinalDecision;
    overallFeedback: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  submitError?: string;
  applicant: {
    name: string;
    rollNumber: string;
    appliedPath?: string | null;
  };
  interviewerName: string;
  roomNumber: number;
  durationFormatted: string;
  evaluatedPath: EvaluationPathId | null;
  criteria: CriterionEvaluationItem[];
  scoreResult: FinalScoreResult | null;
  initialOverallFeedback?: string;
}

const DECISION_CONFIG: Record<
  FinalDecision,
  {
    label: string;
    description: string;
    activeClass: string;
    inactiveClass: string;
    borderClass: string;
    icon: string;
  }
> = {
  Approved: {
    label: "Approved",
    description: "Strong candidate who clearly meets club values and requirements.",
    activeClass: "bg-[#00FF66]/15 text-[#00FF66] border-[#00FF66] shadow-[0_0_15px_rgba(0,255,102,0.2)]",
    inactiveClass: "bg-[#0B0D0C] text-[#8A938D] border-[#1D2A22] hover:border-[#00FF66]/40 hover:text-[#F5F5F5]",
    borderClass: "border-[#00FF66]",
    icon: "check_circle",
  },
  Pending: {
    label: "Pending",
    description: "Acceptable candidate, pending comparison against queue capacity.",
    activeClass: "bg-[#FFB020]/15 text-[#FFB020] border-[#FFB020] shadow-[0_0_15px_rgba(255,176,32,0.2)]",
    inactiveClass: "bg-[#0B0D0C] text-[#8A938D] border-[#1D2A22] hover:border-[#FFB020]/40 hover:text-[#F5F5F5]",
    borderClass: "border-[#FFB020]",
    icon: "hourglass_top",
  },
  "Discussion Needed": {
    label: "Discussion Needed",
    description: "Uncertain or split opinions. Requires panel consensus before deciding.",
    activeClass: "bg-[#FF4D4D]/15 text-[#FF4D4D] border-[#FF4D4D] shadow-[0_0_15px_rgba(255,77,77,0.2)]",
    inactiveClass: "bg-[#0B0D0C] text-[#8A938D] border-[#1D2A22] hover:border-[#FF4D4D]/40 hover:text-[#F5F5F5]",
    borderClass: "border-[#FF4D4D]",
    icon: "forum",
  },
};

export default function EndInterviewModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  submitError,
  applicant,
  interviewerName,
  roomNumber,
  durationFormatted,
  evaluatedPath,
  criteria,
  scoreResult,
  initialOverallFeedback = "",
}: EndInterviewModalProps) {
  const [selectedDecision, setSelectedDecision] = useState<FinalDecision | null>(null);
  const [overallFeedback, setOverallFeedback] = useState<string>(initialOverallFeedback);
  const [localError, setLocalError] = useState<string>("");

  if (!isOpen) return null;

  // Evaluation completion status check
  const totalCount = criteria.length;
  const unratedCriteria = criteria.filter(
    (c) => typeof c.rating !== "number" || isNaN(c.rating) || c.rating < 1 || c.rating > 10
  );
  const ratedCount = totalCount - unratedCriteria.length;
  const isComplete = totalCount > 0 && unratedCriteria.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!isComplete) {
      setLocalError(
        `Cannot submit: ${unratedCriteria.length} criteria remain unrated. Please complete all evaluations before ending the interview.`
      );
      return;
    }

    if (!selectedDecision) {
      setLocalError("Please select a mandatory final decision (Approved, Pending, or Discussion Needed).");
      return;
    }

    if (overallFeedback.length > 5000) {
      setLocalError("Overall feedback cannot exceed 5,000 characters.");
      return;
    }

    await onSubmit({
      decision: selectedDecision,
      overallFeedback: overallFeedback.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-[#101412] border border-[#1D2A22] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1D2A22] bg-[#0B0D0C]/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF4D4D]/15 border border-[#FF4D4D]/30 flex items-center justify-center text-[#FF4D4D]">
              <span className="material-symbols-outlined text-lg font-bold">assignment_turned_in</span>
            </div>
            <div>
              <h2 id="modal-title" className="text-sm font-black text-[#F5F5F5] uppercase tracking-wider">
                End Interview & Submit Final Evaluation
              </h2>
              <p className="text-[10px] text-[#8A938D] font-bold uppercase tracking-widest">
                Official Rubric v2 • Room {roomNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-lg border border-[#1D2A22] bg-[#0B0D0C] text-[#8A938D] hover:text-[#F5F5F5] hover:border-[#F5F5F5]/30 flex items-center justify-center transition-all disabled:opacity-50"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-left">
          {/* Candidate & Session Info Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#0B0D0C] border border-[#1D2A22] rounded-xl text-xs">
            <div>
              <p className="text-[9px] text-[#8A938D] font-bold uppercase tracking-wider">Applicant</p>
              <p className="font-bold text-[#F5F5F5] truncate mt-0.5">{applicant.name}</p>
              <p className="text-[10px] text-[#8A938D] font-mono">{applicant.rollNumber}</p>
            </div>
            <div>
              <p className="text-[9px] text-[#8A938D] font-bold uppercase tracking-wider">Evaluation Path</p>
              <p className="font-bold text-[#00FF66] capitalize mt-0.5">
                {evaluatedPath || applicant.appliedPath || "—"}
              </p>
              {applicant.appliedPath && evaluatedPath && applicant.appliedPath !== evaluatedPath && (
                <p className="text-[9px] text-[#FFB020] font-semibold">Applied: {applicant.appliedPath}</p>
              )}
            </div>
            <div>
              <p className="text-[9px] text-[#8A938D] font-bold uppercase tracking-wider">Interviewer</p>
              <p className="font-bold text-[#F5F5F5] truncate mt-0.5">{interviewerName || "—"}</p>
              <p className="text-[10px] text-[#8A938D]">Room {roomNumber}</p>
            </div>
            <div>
              <p className="text-[9px] text-[#8A938D] font-bold uppercase tracking-wider">Interview Duration</p>
              <p className="font-mono font-bold text-sm text-[#00FF66] mt-0.5">{durationFormatted}</p>
              <p className="text-[9px] text-[#8A938D]">Server Authoritative</p>
            </div>
          </div>

          {/* Evaluation Completion Status Card */}
          <div
            className={`p-4 rounded-xl border flex flex-col gap-3 transition-colors ${
              isComplete
                ? "bg-[#00FF66]/5 border-[#00FF66]/30"
                : "bg-[#FFB020]/10 border-[#FFB020]/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`material-symbols-outlined text-lg ${
                    isComplete ? "text-[#00FF66]" : "text-[#FFB020]"
                  }`}
                >
                  {isComplete ? "task_alt" : "pending_actions"}
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-[#F5F5F5]">
                    {isComplete ? "Evaluation Complete" : "Evaluation Incomplete"}
                  </p>
                  <p className="text-[10px] text-[#8A938D] font-bold uppercase tracking-widest">
                    {ratedCount} of {totalCount} criteria rated
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-[#8A938D] font-bold uppercase tracking-widest">
                  {isComplete ? "Final Score" : "Provisional Subtotal"}
                </p>
                <p
                  className={`font-mono text-xl font-bold ${
                    isComplete ? "text-[#00FF66]" : "text-[#FFB020]"
                  }`}
                >
                  {scoreResult?.totalWeightedScoreFormatted || "0.00"}
                  <span className="text-xs text-[#8A938D] font-normal"> / 100</span>
                </p>
              </div>
            </div>

            {/* List Unrated Criteria If Any */}
            {!isComplete && (
              <div className="mt-2 pt-3 border-t border-[#FFB020]/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#FFB020] mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs">warning</span>
                  {unratedCriteria.length} Criteria require ratings (1–10) before submission:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {unratedCriteria.map((c) => (
                    <span
                      key={c.id}
                      className="px-2.5 py-1 bg-[#FFB020]/10 border border-[#FFB020]/30 rounded-md text-[10px] font-bold text-[#FFB020]"
                    >
                      {c.name} ({c.weight}%)
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 text-xs font-bold text-[#00FF66] hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">arrow_back</span>
                  Return to workspace to complete scoring
                </button>
              </div>
            )}
          </div>

          {/* Mandatory Final Decision */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-[#F5F5F5] flex items-center gap-1.5">
                <span>Final Decision</span>
                <span className="text-[#FF4D4D] text-xs font-black">*</span>
                <span className="text-[9px] text-[#8A938D] font-bold uppercase tracking-widest">(Mandatory)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["Approved", "Pending", "Discussion Needed"] as FinalDecision[]).map((dec) => {
                const conf = DECISION_CONFIG[dec];
                const isSelected = selectedDecision === dec;
                return (
                  <button
                    key={dec}
                    type="button"
                    onClick={() => {
                      setSelectedDecision(dec);
                      setLocalError("");
                    }}
                    disabled={isSubmitting}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer disabled:opacity-50 ${
                      isSelected ? conf.activeClass : conf.inactiveClass
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm font-bold">{conf.icon}</span>
                        {conf.label}
                      </span>
                      {isSelected && (
                        <span className="material-symbols-outlined text-xs font-black">check_circle</span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#8A938D] leading-tight line-clamp-2">
                      {conf.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Overall Feedback */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="overall-feedback" className="text-xs font-black uppercase tracking-wider text-[#F5F5F5]">
                Overall Feedback <span className="text-[9px] text-[#8A938D] font-bold tracking-widest font-mono">(Optional)</span>
              </label>
              <span
                className={`text-[9px] font-mono ${
                  overallFeedback.length > 4900 ? "text-[#FF4D4D]" : "text-[#8A938D]"
                }`}
              >
                {overallFeedback.length} / 5,000
              </span>
            </div>
            <textarea
              id="overall-feedback"
              value={overallFeedback}
              onChange={(e) => setOverallFeedback(e.target.value.slice(0, 5000))}
              disabled={isSubmitting}
              rows={3}
              placeholder="Summary observations, key strengths, growth areas or consensus notes for this candidate..."
              className="w-full bg-[#0B0D0C] border border-[#1D2A22] rounded-xl px-4 py-3 text-xs text-[#F5F5F5] placeholder:text-[#8A938D]/40 focus:ring-1 focus:ring-[#00FF66] focus:border-[#00FF66] transition-all outline-none resize-none disabled:opacity-50"
            />
          </div>

          {/* Error Message */}
          {(localError || submitError) && (
            <div className="p-3 bg-[#FF4D4D]/10 border border-[#FF4D4D]/30 rounded-xl text-xs text-[#FF4D4D] flex items-center gap-2">
              <span className="material-symbols-outlined text-base flex-shrink-0">error</span>
              <p className="font-bold">{localError || submitError}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#1D2A22] bg-[#0B0D0C]/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-lg border border-[#1D2A22] bg-[#101412] text-xs font-black uppercase tracking-wider text-[#8A938D] hover:text-[#F5F5F5] hover:bg-[#1A231E] transition-all disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isComplete || !selectedDecision || isSubmitting}
            className="px-6 py-2.5 rounded-lg bg-[#00FF66] text-[#050505] text-xs font-black uppercase tracking-wider hover:bg-[#00B84A] transition-all shadow-[0_0_15px_rgba(0,255,102,0.3)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-[#050505] border-t-transparent rounded-full animate-spin" />
                Submitting Evaluation...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm font-bold">check</span>
                Confirm & End Interview
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

