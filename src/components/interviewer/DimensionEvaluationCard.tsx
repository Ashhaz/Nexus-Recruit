"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  EvaluationPathId,
  EVALUATION_PATH_IDS,
  PATH_CONFIGS,
  OFFICIAL_RATING_SCALE,
  getPathConfig,
  normalizePathLabel,
  calculateWeightedScore,
  calculateFinalScore,
  EvaluationCriterion,
  FinalScoreResult,
} from "@/lib/dimensions";
import {
  EvaluationsByPath,
  WorkspaceEvaluationDraft,
  getEvaluationDraftStorageKey,
  createInitialEvaluationsByPath,
  mergeDraftIntoEvaluationsByPath,
  loadEvaluationDraft,
  saveEvaluationDraft,
} from "@/lib/evaluationDrafts";

export interface DimensionEvaluationCardProps {
  applicantId: string;
  interviewerId: string;
  eventId: string;
  roomNumber: number;
  interviewSessionId?: string | null;
  appliedPath?: string | null;
  savedCriteriaEvaluation?: {
    rubricVersion?: string;
    path?: string;
    criteria?: Array<{
      id: string;
      name?: string;
      description?: string;
      weight?: number;
      rating?: number | null;
      weightedScore?: number;
      feedback?: string;
      reviewed?: boolean;
    }>;
  } | null;
  savedDimensionEvaluation?: any;
  isReadOnly?: boolean;
  onEvaluationChange?: (data: {
    currentPath: EvaluationPathId | null;
    evaluationsByPath: EvaluationsByPath;
    scoreResult: FinalScoreResult | null;
  }) => void;
}

export default function DimensionEvaluationCard({
  applicantId,
  interviewerId,
  eventId,
  roomNumber,
  interviewSessionId,
  appliedPath,
  savedCriteriaEvaluation,
  isReadOnly = false,
  onEvaluationChange,
}: DimensionEvaluationCardProps) {
  // Storage key uniquely scoped by applicant, interviewer, event, room, and interview session (Rubric v2)
  const storageKey = getEvaluationDraftStorageKey({
    applicantId,
    interviewerId,
    eventId,
    roomNumber,
    interviewSessionId,
  });

  // State
  const [evaluationsByPath, setEvaluationsByPath] = useState<EvaluationsByPath>(() =>
    createInitialEvaluationsByPath(savedCriteriaEvaluation)
  );
  const [currentPath, setCurrentPath] = useState<EvaluationPathId | null>(null);
  const [currentCriterionId, setCurrentCriterionId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [hydrated, setHydrated] = useState(false);
  const [showRatingScaleGuide, setShowRatingScaleGuide] = useState(false);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Hydration: Check sessionStorage v2 draft first, then fallback to backend/appliedPath
  useEffect(() => {
    const canonicalApplied = normalizePathLabel(appliedPath);
    const canonicalSaved = savedCriteriaEvaluation?.path
      ? normalizePathLabel(savedCriteriaEvaluation.path)
      : null;

    let initialPath: EvaluationPathId | null = canonicalSaved || canonicalApplied || null;
    let initialByPath = createInitialEvaluationsByPath(savedCriteriaEvaluation);
    let initialCritId: string | null = null;

    if (storageKey) {
      const draft = loadEvaluationDraft(storageKey, applicantId, interviewSessionId);
      if (draft) {
        if (draft.evaluationsByPath) {
          initialByPath = mergeDraftIntoEvaluationsByPath(initialByPath, draft.evaluationsByPath);
        }
        if (draft.currentPath && EVALUATION_PATH_IDS.includes(draft.currentPath)) {
          initialPath = draft.currentPath;
        }
        const savedCrit = draft.currentCriterionId || draft.currentDimensionId;
        if (savedCrit) {
          initialCritId = savedCrit;
        }
      }
    }

    if (initialPath) {
      const config = getPathConfig(initialPath);
      if (config) {
        const validCrit = config.criteria.find((c) => c.id === initialCritId);
        initialCritId = validCrit ? validCrit.id : config.criteria[0].id;
      }
    }

    setEvaluationsByPath(initialByPath);
    setCurrentPath(initialPath);
    setCurrentCriterionId(initialCritId);
    setHydrated(true);
    setSaveStatus("idle");
  }, [applicantId, appliedPath, savedCriteriaEvaluation, storageKey, interviewSessionId]);

  // 2. Draft Persistence: Saves to sessionStorage on change
  const triggerSave = useCallback(
    (
      newPath: EvaluationPathId | null,
      newCritId: string | null,
      newEvaluations: EvaluationsByPath
    ) => {
      if (!storageKey || !applicantId || isReadOnly) return;

      setSaveStatus("saving");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        const draft: WorkspaceEvaluationDraft = {
          version: 2,
          rubricVersion: "nexus-interview-v2",
          applicantId,
          interviewerId: interviewerId || "unknown",
          eventId: eventId || "global",
          roomNumber,
          interviewSessionId: interviewSessionId || null,
          currentPath: newPath,
          currentCriterionId: newCritId,
          currentDimensionId: newCritId,
          evaluationsByPath: newEvaluations,
          updatedAt: Date.now(),
        };

        const success = saveEvaluationDraft(storageKey, draft);
        if (success) {
          setSaveStatus("saved");
          if (onEvaluationChange) {
            const activeItems = newPath ? newEvaluations[newPath]?.criteria || [] : [];
            const scoreResult = newPath ? calculateFinalScore(activeItems) : null;
            onEvaluationChange({
              currentPath: newPath,
              evaluationsByPath: newEvaluations,
              scoreResult,
            });
          }
        } else {
          setSaveStatus("error");
        }
      }, 250);
    },
    [applicantId, eventId, interviewerId, isReadOnly, onEvaluationChange, roomNumber, storageKey]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Handlers
  const handlePathChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const normalized = normalizePathLabel(val);

    if (!normalized) {
      setCurrentPath(null);
      setCurrentCriterionId(null);
      triggerSave(null, null, evaluationsByPath);
      return;
    }

    const config = getPathConfig(normalized);
    const newCritId = config ? config.criteria[0].id : null;

    setCurrentPath(normalized);
    setCurrentCriterionId(newCritId);
    triggerSave(normalized, newCritId, evaluationsByPath);
  };

  const handleCriterionSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const critId = e.target.value;
    setCurrentCriterionId(critId);
    triggerSave(currentPath, critId, evaluationsByPath);
  };

  // Official rating selection (1 to 10)
  const handleRatingSelect = (ratingValue: number) => {
    if (isReadOnly || !currentPath || !currentCriterionId) return;

    setEvaluationsByPath((prev) => {
      const pathState = prev[currentPath];
      if (!pathState) return prev;

      const updatedCriteria = pathState.criteria.map((c) => {
        if (c.id === currentCriterionId) {
          const weightedScore = calculateWeightedScore(ratingValue, c.weight);
          return {
            ...c,
            rating: ratingValue,
            score: ratingValue, // compatibility
            weightedScore,
            reviewed: true, // A criterion is reviewed ONLY upon explicit rating selection
          };
        }
        return c;
      });

      const nextState: EvaluationsByPath = {
        ...prev,
        [currentPath]: {
          path: currentPath,
          criteria: updatedCriteria,
          dimensions: updatedCriteria,
        },
      };

      triggerSave(currentPath, currentCriterionId, nextState);
      return nextState;
    });
  };

  // Optional paragraph feedback (does NOT mark criterion reviewed by itself)
  const handleFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isReadOnly || !currentPath || !currentCriterionId) return;
    const text = e.target.value.slice(0, 5000); // 5,000 char maximum

    setEvaluationsByPath((prev) => {
      const pathState = prev[currentPath];
      if (!pathState) return prev;

      const updatedCriteria = pathState.criteria.map((c) => {
        if (c.id === currentCriterionId) {
          return {
            ...c,
            feedback: text,
            // Reviewed status is determined strictly by explicit rating selection
          };
        }
        return c;
      });

      const nextState: EvaluationsByPath = {
        ...prev,
        [currentPath]: {
          path: currentPath,
          criteria: updatedCriteria,
          dimensions: updatedCriteria,
        },
      };

      triggerSave(currentPath, currentCriterionId, nextState);
      return nextState;
    });
  };

  // Path & criterion resolution
  const pathConfig = currentPath ? getPathConfig(currentPath) : null;
  const currentPathCriteria = currentPath ? evaluationsByPath[currentPath]?.criteria || [] : [];
  const currentCritIndex = currentPathCriteria.findIndex((c) => c.id === currentCriterionId);
  const activeCriterion = currentPathCriteria[currentCritIndex] || null;
  const activeCriterionConfig: EvaluationCriterion | undefined = pathConfig?.criteria.find(
    (c) => c.id === currentCriterionId
  );

  // Scoring & review progress
  const scoreResult = calculateFinalScore(currentPathCriteria);
  const reviewedCount = scoreResult.reviewedCount;
  const totalCount = currentPathCriteria.length;
  const remainingCount = totalCount - reviewedCount;

  const handlePrev = () => {
    if (currentCritIndex > 0) {
      const prevCritId = currentPathCriteria[currentCritIndex - 1].id;
      setCurrentCriterionId(prevCritId);
      triggerSave(currentPath, prevCritId, evaluationsByPath);
    }
  };

  const handleNext = () => {
    if (currentCritIndex < currentPathCriteria.length - 1) {
      const nextCritId = currentPathCriteria[currentCritIndex + 1].id;
      setCurrentCriterionId(nextCritId);
      triggerSave(currentPath, nextCritId, evaluationsByPath);
    }
  };

  if (!hydrated) {
    return (
      <div className="w-full bg-[#101412] border border-[#1D2A22] rounded-xl p-6 shadow-xl animate-pulse">
        <div className="h-4 bg-[#0B0D0C] rounded w-1/3 mb-4" />
        <div className="h-8 bg-[#0B0D0C] rounded w-full mb-3" />
        <div className="h-24 bg-[#0B0D0C] rounded w-full" />
      </div>
    );
  }

  return (
    <div className="w-full bg-[#101412] border border-[#1D2A22] rounded-xl p-5 shadow-xl flex flex-col gap-4 text-left">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1D2A22] pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#00FF66] text-lg font-bold">
            fact_check
          </span>
          <div>
            <h2 className="text-xs font-black text-[#F5F5F5] uppercase tracking-widest">
              Interview Evaluation
            </h2>
            <span className="text-[9px] font-mono text-[#8A938D] font-bold block">
              Official NEXUS Rubric v2
            </span>
          </div>
        </div>

        {/* Draft Status Indicator */}
        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider">
          {saveStatus === "saving" && (
            <span className="text-[#8A938D] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8A938D] animate-ping" />
              Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-[#00FF66] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66]" />
              Draft saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-[#FF4D4D] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D4D]" />
              Unable to save draft
            </span>
          )}
          {saveStatus === "idle" && (
            <span className="text-[#8A938D]/60 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8A938D]/40" />
              Ready
            </span>
          )}
        </div>
      </div>

      {/* Path Selector */}
      <div>
        <label
          htmlFor="path-selector"
          className="text-[9px] font-black uppercase tracking-widest text-[#8A938D] block mb-1.5"
        >
          Evaluation Path
        </label>
        <div className="relative">
          <select
            id="path-selector"
            value={currentPath || ""}
            onChange={handlePathChange}
            disabled={isReadOnly}
            className="w-full bg-[#0B0D0C] border border-[#1D2A22] rounded-lg px-3.5 py-2.5 text-xs font-bold text-[#F5F5F5] focus:outline-none focus:border-[#00FF66] transition-colors appearance-none cursor-pointer pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="" disabled className="text-[#8A938D]">
              Path not detected — Select Path...
            </option>
            <option value="learner" className="bg-[#101412] text-[#F5F5F5]">
              Learner&apos;s Path (7 Criteria)
            </option>
            <option value="all-rounder" className="bg-[#101412] text-[#F5F5F5]">
              All-Rounder&apos;s Path (10 Criteria)
            </option>
            <option value="contributor" className="bg-[#101412] text-[#F5F5F5]">
              Contributor&apos;s Path (7 Criteria)
            </option>
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#8A938D] pointer-events-none text-base">
            expand_more
          </span>
        </div>
      </div>

      {/* When no path is selected */}
      {!currentPath && (
        <div className="p-4 rounded-lg bg-[#0B0D0C] border border-[#FFB020]/30 text-center my-2">
          <span className="material-symbols-outlined text-[#FFB020] text-2xl block mb-1">
            warning
          </span>
          <p className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wide">
            Path Not Detected
          </p>
          <p className="text-[10px] text-[#8A938D] mt-1 leading-relaxed">
            Please choose the candidate&apos;s evaluation path from the dropdown above to begin scoring.
          </p>
        </div>
      )}

      {/* When path is selected: Official Criteria Controls */}
      {currentPath && pathConfig && (
        <>
          {/* Path Purpose */}
          <div className="px-3 py-2 bg-[#0B0D0C] border border-[#1D2A22]/70 rounded-lg">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#00FF66] block mb-0.5">
              Path Purpose
            </span>
            <p className="text-[11px] text-[#8A938D] leading-relaxed">
              {pathConfig.purpose}
            </p>
          </div>

          {/* Evaluation Summary & Provisional Subtotal */}
          <div className="p-3 bg-[#0B0D0C] border border-[#1D2A22] rounded-lg flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8A938D] uppercase tracking-wider">
                {scoreResult.isComplete ? "Final Score" : "Provisional Subtotal"}
              </span>
              <span className="text-sm font-mono font-black text-[#00FF66]">
                {scoreResult.totalWeightedScoreFormatted} / 100
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold pt-1 border-t border-[#1D2A22]/50">
              <span className="text-[#8A938D]">
                {reviewedCount} of {totalCount} Reviewed
                {remainingCount > 0 && ` (${remainingCount} remaining)`}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  scoreResult.isComplete
                    ? "bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30"
                    : "bg-[#FFB020]/10 text-[#FFB020] border border-[#FFB020]/30"
                }`}
              >
                {scoreResult.isComplete ? "Complete" : "Incomplete"}
              </span>
            </div>
          </div>

          {/* Criterion Navigation & Progress Banner */}
          <div className="flex items-center justify-between bg-[#0B0D0C] px-3.5 py-2 rounded-lg border border-[#1D2A22]">
            <span className="text-[10px] font-bold text-[#F5F5F5] uppercase tracking-wider">
              Criterion {currentCritIndex + 1} of {totalCount} — {pathConfig.name}
            </span>
            <button
              type="button"
              onClick={() => setShowRatingScaleGuide((v) => !v)}
              className="text-[9px] font-bold uppercase tracking-wider text-[#00FF66] hover:text-[#00FF66]/80 flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[13px]">help_outline</span>
              <span>{showRatingScaleGuide ? "Hide Scale" : "Rating Scale"}</span>
            </button>
          </div>

          {/* Collapsible Official Rating Scale Guide */}
          {showRatingScaleGuide && (
            <div className="p-3 bg-[#0B0D0C] border border-[#00FF66]/30 rounded-lg text-left space-y-2">
              <div className="flex items-center justify-between border-b border-[#1D2A22] pb-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#00FF66]">
                  Official NEXUS Rating Scale (1 to 10)
                </span>
                <span className="text-[9px] text-[#8A938D]">1 = Poor, 10 = Excellent</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 text-[10px]">
                {OFFICIAL_RATING_SCALE.map((tier) => (
                  <div key={tier.range} className="flex items-start gap-2">
                    <span className="font-mono font-bold text-[#00FF66] w-8 flex-shrink-0">
                      {tier.range}
                    </span>
                    <span className="font-bold text-[#F5F5F5] w-28 flex-shrink-0">
                      {tier.label}:
                    </span>
                    <span className="text-[#8A938D] leading-snug">
                      {tier.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Criterion Selector Dropdown */}
          <div>
            <label
              htmlFor="criterion-selector"
              className="text-[9px] font-black uppercase tracking-widest text-[#8A938D] block mb-1.5"
            >
              Select Criterion
            </label>
            <div className="relative">
              <select
                id="criterion-selector"
                value={currentCriterionId || ""}
                onChange={handleCriterionSelect}
                disabled={isReadOnly}
                className="w-full bg-[#0B0D0C] border border-[#1D2A22] rounded-lg px-3.5 py-2.5 text-xs font-bold text-[#F5F5F5] focus:outline-none focus:border-[#00FF66] transition-colors appearance-none cursor-pointer pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentPathCriteria.map((c, idx) => {
                  const ratingLabel =
                    c.rating !== null ? `${c.rating}/10` : "Unrated";
                  const wsLabel =
                    c.rating !== null
                      ? `${c.weightedScore.toFixed(2)}/${c.weight}`
                      : `—/${c.weight}`;
                  return (
                    <option
                      key={c.id}
                      value={c.id}
                      className="bg-[#101412] text-[#F5F5F5]"
                    >
                      {idx + 1}. {c.name} [Weight: {c.weight}%] — ({ratingLabel}) [{wsLabel}] {c.reviewed ? "✓" : "○"}
                    </option>
                  );
                })}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#8A938D] pointer-events-none text-base">
                expand_more
              </span>
            </div>
          </div>

          {/* Criterion Guidance & Official Description */}
          {activeCriterionConfig && (
            <div className="p-3 bg-[#0B0D0C] border border-[#1D2A22] rounded-lg text-left">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-[#00FF66] uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[13px]">info</span>
                  <span>{activeCriterionConfig.name}</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#00FF66] bg-[#00FF66]/10 px-2 py-0.5 rounded border border-[#00FF66]/20">
                  Weight: {activeCriterionConfig.weight}%
                </span>
              </div>
              <p className="text-[11px] text-[#8A938D] leading-relaxed">
                {activeCriterionConfig.description}
              </p>
            </div>
          )}

          {/* Rating Selector (1 to 10 Pills) */}
          {activeCriterion && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#8A938D]">
                  Rating Selector (1 - 10)
                </span>
                <div className="text-[10px] font-mono font-bold flex items-center gap-2">
                  {activeCriterion.rating !== null ? (
                    <>
                      <span className="text-[#00FF66]">
                        Rating: {activeCriterion.rating} / 10
                      </span>
                      <span className="text-[#8A938D]">
                        (Weighted: {activeCriterion.weightedScore.toFixed(2)} / {activeCriterion.weight})
                      </span>
                    </>
                  ) : (
                    <span className="text-[#FFB020] font-bold">
                      Not rated yet (Explicit selection required)
                    </span>
                  )}
                </div>
              </div>

              {/* 1 to 10 Interactive Pills */}
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rVal) => {
                  const isSelected = activeCriterion.rating === rVal;
                  return (
                    <button
                      key={rVal}
                      type="button"
                      onClick={() => handleRatingSelect(rVal)}
                      disabled={isReadOnly}
                      className={`h-9 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center border ${
                        isSelected
                          ? "bg-[#00FF66] text-[#050505] font-black border-[#00FF66] shadow-[0_0_12px_rgba(0,255,102,0.4)] scale-105"
                          : "bg-[#0B0D0C] text-[#8A938D] border-[#1D2A22] hover:border-[#00FF66]/50 hover:text-[#F5F5F5]"
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {rVal}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Paragraph Feedback (Optional Interviewer Note) */}
          {activeCriterion && (
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="criterion-paragraph-review"
                  className="text-[9px] font-black uppercase tracking-widest text-[#8A938D]"
                >
                  Criterion Paragraph Review (Optional Note)
                </label>
                <span className="text-[9px] font-mono text-[#8A938D]">
                  {activeCriterion.feedback.length} / 5000
                </span>
              </div>

              <textarea
                id="criterion-paragraph-review"
                value={activeCriterion.feedback}
                onChange={handleFeedbackChange}
                disabled={isReadOnly}
                rows={3}
                maxLength={5000}
                placeholder={
                  isReadOnly
                    ? "No feedback recorded in read-only mode."
                    : `Optional notes on ${activeCriterion.name} (Ratings determine score completion)...`
                }
                className="w-full bg-[#0B0D0C] border border-[#1D2A22] rounded-lg p-3 text-xs text-[#F5F5F5] placeholder:text-[#8A938D]/40 focus:outline-none focus:border-[#00FF66] focus:ring-1 focus:ring-[#00FF66]/30 transition-all resize-y custom-scrollbar min-h-[80px] disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
              />
            </div>
          )}

          {/* Navigation Controls & Jump Dots */}
          <div className="pt-2 border-t border-[#1D2A22] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentCritIndex <= 0}
              className="flex-1 py-2 px-3 rounded-lg bg-[#0B0D0C] border border-[#1D2A22] hover:border-[#00FF66]/40 text-[#F5F5F5] text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[#1D2A22]"
            >
              <span className="material-symbols-outlined text-sm font-bold">arrow_back</span>
              <span>Previous</span>
            </button>

            {/* Quick Criterion Jump Dots */}
            <div className="flex items-center gap-1 flex-wrap justify-center max-w-[200px]">
              {currentPathCriteria.map((c, idx) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCurrentCriterionId(c.id);
                    triggerSave(currentPath, c.id, evaluationsByPath);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentCritIndex
                      ? "bg-[#00FF66] w-4"
                      : c.reviewed
                      ? "bg-[#00FF66]/70 w-2"
                      : "bg-[#1D2A22] hover:bg-[#8A938D] w-2"
                  }`}
                  title={`${idx + 1}. ${c.name} [Weight: ${c.weight}%] (${c.reviewed ? "Rated: " + c.rating : "Unrated"})`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentCritIndex >= currentPathCriteria.length - 1}
              className="flex-1 py-2 px-3 rounded-lg bg-[#0B0D0C] border border-[#1D2A22] hover:border-[#00FF66]/40 text-[#F5F5F5] text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[#1D2A22]"
            >
              <span>Next</span>
              <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
