/**
 * Path-Specific Dimension / Criteria Evaluation Draft Persistence Helpers (Rubric v2)
 *
 * Handles client-side local draft saving, restoration, and isolation in sessionStorage.
 * Strictly uses official rubric v2 ("nexus-interview-v2").
 * Scoped by applicantId, interviewerId, eventId, and roomNumber.
 * Legacy v1 drafts are never loaded as official v2 evaluations.
 */

import type {
  EvaluationPathId,
  CriterionEvaluationItem,
} from "./dimensions.ts";
import {
  RUBRIC_VERSION,
  EVALUATION_PATH_IDS,
  normalizePathLabel,
  createDefaultCriteriaEvaluation,
  calculateWeightedScore,
  getPathConfig,
} from "./dimensions.ts";

export const DRAFT_STORAGE_PREFIX = "nexus_v2_eval_draft" as const;

export interface PathDraftState {
  path: EvaluationPathId;
  criteria: CriterionEvaluationItem[];
  // Compatibility alias
  dimensions: CriterionEvaluationItem[];
}

export type EvaluationsByPath = Record<EvaluationPathId, PathDraftState>;

export interface WorkspaceEvaluationDraft {
  version: 2;
  rubricVersion: typeof RUBRIC_VERSION;
  applicantId: string;
  interviewerId: string;
  eventId: string;
  roomNumber: number;
  interviewSessionId?: string | null;
  currentPath: EvaluationPathId | null;
  currentCriterionId: string | null;
  currentDimensionId?: string | null; // compatibility alias
  evaluationsByPath: EvaluationsByPath;
  updatedAt: number;
}

/**
 * Builds an isolated, deterministic sessionStorage draft key for Rubric v2.
 * Strictly guarantees that different applicants, interviewers, rooms, events,
 * or interview sessions never share or overwrite each other's drafts.
 */
export function getEvaluationDraftStorageKey(params: {
  applicantId?: string | null;
  interviewerId?: string | null;
  eventId?: string | null;
  roomNumber?: number | string | null;
  interviewSessionId?: string | null;
}): string | null {
  const app = params.applicantId?.trim();
  if (!app) return null;

  const intId = params.interviewerId?.trim() || "unknown";
  const ev = params.eventId?.trim() || "global";
  const rm =
    params.roomNumber !== undefined && params.roomNumber !== null
      ? String(params.roomNumber).trim()
      : "0";
  const sesPart = params.interviewSessionId?.trim()
    ? `_ses_${params.interviewSessionId.trim()}`
    : "";

  return `${DRAFT_STORAGE_PREFIX}_ev_${ev}_rm_${rm}_int_${intId}_app_${app}${sesPart}`;
}

/**
 * Initializes baseline evaluations for all 3 paths under the official Rubric v2.
 * All criteria start unrated (rating: null, reviewed: false).
 * If a previously saved backend criteriaEvaluation (v2) exists, merges it.
 * Legacy 5-dimension evaluations are never mapped or treated as official v2 evaluations.
 */
export function createInitialEvaluationsByPath(
  savedEvaluation?: {
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
  } | null
): EvaluationsByPath {
  const result = {} as EvaluationsByPath;

  for (const pathId of EVALUATION_PATH_IDS) {
    const defaultEval = createDefaultCriteriaEvaluation(pathId)!;
    result[pathId] = {
      path: pathId,
      criteria: defaultEval.criteria,
      dimensions: defaultEval.criteria,
    };
  }

  // Only merge if saved evaluation explicitly uses rubric v2
  if (
    savedEvaluation?.rubricVersion === RUBRIC_VERSION &&
    savedEvaluation?.path &&
    Array.isArray(savedEvaluation.criteria)
  ) {
    const canonicalPath = normalizePathLabel(savedEvaluation.path);
    if (canonicalPath && result[canonicalPath]) {
      const savedMap = new Map(savedEvaluation.criteria.map((c) => [c.id, c]));
      const updatedCriteria = result[canonicalPath].criteria.map((c) => {
        const saved = savedMap.get(c.id);
        if (saved) {
          const hasValidRating =
            typeof saved.rating === "number" &&
            !isNaN(saved.rating) &&
            saved.rating >= 1 &&
            saved.rating <= 10;

          const rating = hasValidRating ? Math.round(saved.rating!) : null;
          const weightedScore = hasValidRating ? calculateWeightedScore(rating, c.weight) : 0;
          const reviewed = hasValidRating;

          return {
            ...c,
            rating,
            score: rating,
            weightedScore,
            feedback: typeof saved.feedback === "string" ? saved.feedback : "",
            reviewed,
          };
        }
        return c;
      });

      result[canonicalPath] = {
        path: canonicalPath,
        criteria: updatedCriteria,
        dimensions: updatedCriteria,
      };
    }
  }

  return result;
}

/**
 * Safely merges a restored local v2 draft into existing evaluationsByPath,
 * preserving all 3 paths' drafts.
 */
export function mergeDraftIntoEvaluationsByPath(
  base: EvaluationsByPath,
  draftEvaluations: EvaluationsByPath
): EvaluationsByPath {
  if (!draftEvaluations || typeof draftEvaluations !== "object") return base;

  const merged = { ...base };
  for (const pathId of EVALUATION_PATH_IDS) {
    const draftPath = draftEvaluations[pathId];
    const draftItems = draftPath?.criteria || draftPath?.dimensions;

    if (draftItems && Array.isArray(draftItems)) {
      const draftMap = new Map(draftItems.map((item) => [item.id || item.dimensionId, item]));
      const updated = merged[pathId].criteria.map((c) => {
        const draftItem = draftMap.get(c.id);
        if (draftItem) {
          const hasValidRating =
            typeof draftItem.rating === "number" &&
            !isNaN(draftItem.rating) &&
            draftItem.rating >= 1 &&
            draftItem.rating <= 10;

          const rating = hasValidRating ? Math.round(draftItem.rating!) : null;
          const weightedScore = hasValidRating ? calculateWeightedScore(rating, c.weight) : 0;
          // In official rubric, a criterion is reviewed ONLY if an explicit valid rating is selected
          const reviewed = hasValidRating;

          return {
            ...c,
            rating,
            score: rating,
            weightedScore,
            feedback: typeof draftItem.feedback === "string" ? draftItem.feedback : c.feedback,
            reviewed,
          };
        }
        return c;
      });

      merged[pathId] = {
        path: pathId,
        criteria: updated,
        dimensions: updated,
      };
    }
  }
  return merged;
}

/**
 * Loads a draft from sessionStorage with rubric v2 validation & applicant isolation checks.
 * Rejects legacy v1 drafts and corrupted content safely without throwing.
 */
export function loadEvaluationDraft(
  key: string | null,
  expectedApplicantId: string,
  expectedSessionId?: string | null
): WorkspaceEvaluationDraft | null {
  if (typeof window === "undefined" || !key) return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    // Check version and rubric identity: must be v2
    if (parsed.version !== 2 || parsed.rubricVersion !== RUBRIC_VERSION) {
      console.warn("[evaluationDrafts] Stored draft is not Rubric v2. Ignoring legacy draft.");
      return null;
    }

    // Verify applicant isolation
    if (parsed.applicantId !== expectedApplicantId) {
      console.warn("[evaluationDrafts] Mismatched applicant in stored draft. Ignoring.");
      return null;
    }

    // Verify session isolation when expectedSessionId is provided
    if (
      expectedSessionId &&
      parsed.interviewSessionId &&
      parsed.interviewSessionId !== expectedSessionId
    ) {
      console.warn("[evaluationDrafts] Mismatched interviewSessionId in stored draft. Ignoring.");
      return null;
    }

    if (!parsed.evaluationsByPath || typeof parsed.evaluationsByPath !== "object") {
      return null;
    }

    // Verify that the draft contains valid official criteria counts
    const pathState = parsed.evaluationsByPath;
    for (const pid of EVALUATION_PATH_IDS) {
      const config = getPathConfig(pid);
      const items = pathState[pid]?.criteria || pathState[pid]?.dimensions;
      if (config && (!Array.isArray(items) || items.length !== config.criteria.length)) {
        console.warn(`[evaluationDrafts] Draft for path ${pid} does not match official criteria count. Ignoring.`);
        return null;
      }
    }

    return parsed as WorkspaceEvaluationDraft;
  } catch (err) {
    console.warn("[evaluationDrafts] Failed to parse sessionStorage draft:", err);
    return null;
  }
}

/**
 * Saves a draft to sessionStorage safely with error handling and v2 version tags.
 */
export function saveEvaluationDraft(
  key: string | null,
  draft: WorkspaceEvaluationDraft
): boolean {
  if (typeof window === "undefined" || !key) return false;
  try {
    const payload: WorkspaceEvaluationDraft = {
      ...draft,
      version: 2,
      rubricVersion: RUBRIC_VERSION,
    };
    sessionStorage.setItem(key, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error("[evaluationDrafts] Failed to save draft to sessionStorage:", err);
    return false;
  }
}

/**
 * Removes a draft from sessionStorage when explicitly requested.
 */
export function clearEvaluationDraft(key: string | null): void {
  if (typeof window === "undefined" || !key) return;
  try {
    sessionStorage.removeItem(key);
  } catch (err) {
    console.warn("[evaluationDrafts] Failed to clear sessionStorage draft:", err);
  }
}
