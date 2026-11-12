/**
 * Official NEXUS Coding Club Interview Evaluation Criteria Configuration & Scoring Helpers
 *
 * Source of Truth: Official NEXUS Coding Club Interview Evaluation Criteria.
 * Defines the 3 core evaluation paths:
 * - Learner's Path (7 criteria, total weight 100)
 * - All-Rounder's Path (10 criteria, total weight 100)
 * - Contributor's Path (7 criteria, total weight 100)
 */

export const RUBRIC_VERSION = "nexus-interview-v2" as const;

export const EVALUATION_PATH_IDS = ["learner", "contributor", "all-rounder"] as const;
export type EvaluationPathId = (typeof EVALUATION_PATH_IDS)[number];

export interface EvaluationCriterion {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly weight: number;
}

export interface EvaluationPathConfig {
  readonly id: EvaluationPathId;
  readonly name: string;
  readonly purpose: string;
  readonly criteria: readonly EvaluationCriterion[];
  // Backwards compatibility alias
  readonly dimensions: readonly EvaluationCriterion[];
}

// Backward-compatible type aliases
export type DimensionConfig = EvaluationCriterion;
export type PathConfig = EvaluationPathConfig;

export interface CriterionEvaluationItem {
  id: string;
  name: string;
  description: string;
  weight: number;
  rating: number | null; // integer 1-10, strictly null when unrated
  weightedScore: number; // (rating / 10) * weight, rounded to 2 decimals
  feedback: string;
  reviewed: boolean; // strictly true ONLY when rating is an integer 1-10
  // Compatibility aliases
  dimensionId?: string;
  score?: number | null;
}

export type DimensionEvaluationItem = CriterionEvaluationItem;

export interface CriteriaEvaluationSnapshot {
  rubricVersion: typeof RUBRIC_VERSION;
  path: EvaluationPathId | string;
  criteria: CriterionEvaluationItem[];
  dimensions?: CriterionEvaluationItem[]; // compatibility alias
  overallFeedback: string;
  totalWeightedScore: number;
  isComplete: boolean;
  evaluatedAt: Date | null;
}

export type DimensionEvaluation = CriteriaEvaluationSnapshot;

export interface PathDetectionResult {
  path: EvaluationPathId | null;
  matchedHeader?: string;
  rawValue?: string;
  confidence: "high" | "medium" | "none";
}

export interface RatingScaleTier {
  readonly range: string;
  readonly min: number;
  readonly max: number;
  readonly label: string;
  readonly description: string;
}

/**
 * Official Rating Scale (1 to 10)
 */
export const OFFICIAL_RATING_SCALE: readonly RatingScaleTier[] = [
  {
    range: "1–2",
    min: 1,
    max: 2,
    label: "Poor",
    description: "Unable to demonstrate relevant interest, understanding or willingness.",
  },
  {
    range: "3–4",
    min: 3,
    max: 4,
    label: "Below Expectations",
    description: "Shows limited interest or understanding. Responses lack clarity or depth.",
  },
  {
    range: "5–6",
    min: 5,
    max: 6,
    label: "Satisfactory",
    description: "Demonstrates reasonable interest and basic understanding.",
  },
  {
    range: "7–8",
    min: 7,
    max: 8,
    label: "Good",
    description:
      "Gives thoughtful responses and demonstrates genuine interest, practical thinking or relevant examples.",
  },
  {
    range: "9–10",
    min: 9,
    max: 10,
    label: "Excellent",
    description: "Demonstrates strong interest, initiative, maturity and well-reasoned responses.",
  },
] as const;

/**
 * PATH A — Learner's Path (7 Criteria, Total Weight: 100)
 * Purpose: To understand whether the applicant is genuinely interested in learning,
 * participating in and growing with the NEXUS community.
 */
const LEARNER_CRITERIA: readonly EvaluationCriterion[] = [
  {
    id: "culture",
    name: "Culture",
    description:
      "Understand whether the applicant respects NEXUS culture, is open to different perspectives, and is willing to be part of a collaborative learning environment.",
    weight: 10,
  },
  {
    id: "time_management_commitments",
    name: "Time Management & Commitments",
    description:
      "Evaluate whether the applicant can balance academics, personal commitments and NEXUS activities, and whether they can communicate when unavailable.",
    weight: 15,
  },
  {
    id: "curiosity_interest_tech",
    name: "Curiosity & Interest in Tech",
    description:
      "Understand their interest in computer science, programming and emerging technologies. Evaluate whether they explore things out of curiosity and have an interest in learning beyond academics.",
    weight: 20,
  },
  {
    id: "motivation_join_nexus",
    name: "Motivation to Join NEXUS",
    description:
      "Understand why they want to join NEXUS, what they expect from the community and how they see themselves growing through it.",
    weight: 15,
  },
  {
    id: "collaboration_other_learners",
    name: "Collaboration with Other Learners",
    description:
      "Evaluate whether they are comfortable asking for help, helping others, sharing knowledge and learning together rather than treating learning as a competition.",
    weight: 15,
  },
  {
    id: "taking_initiative",
    name: "Taking Initiative",
    description:
      "Understand whether they are willing to step forward when opportunities arise, such as taking a small session, sharing something they learned or helping other learners.",
    weight: 15,
  },
  {
    id: "external_tech_events",
    name: "External Tech Events",
    description:
      "Understand their interest and willingness to participate in hackathons, technical events, workshops and other opportunities outside college, depending on their availability.",
    weight: 10,
  },
] as const;

export const LEARNER_PATH: EvaluationPathConfig = {
  id: "learner",
  name: "Learner's Path",
  purpose:
    "To understand whether the applicant is genuinely interested in learning, participating in and growing with the NEXUS community.",
  criteria: LEARNER_CRITERIA,
  dimensions: LEARNER_CRITERIA,
} as const;

/**
 * PATH B — All-Rounder's Path (10 Criteria, Total Weight: 100)
 * Purpose: To understand whether the applicant is willing to go beyond learning and
 * actively contribute to NEXUS while continuing their own technical growth.
 */
const ALL_ROUNDER_CRITERIA: readonly EvaluationCriterion[] = [
  {
    id: "time_management_commitments",
    name: "Time Management & Commitments",
    description:
      "Evaluate whether the applicant can balance academics, personal responsibilities, learning and NEXUS contributions without neglecting commitments.",
    weight: 10,
  },
  {
    id: "culture",
    name: "Culture",
    description:
      "Understand whether the applicant respects NEXUS values, works well with different people and contributes to a healthy, supportive club environment.",
    weight: 10,
  },
  {
    id: "curiosity_interest_tech",
    name: "Curiosity & Interest in Tech",
    description:
      "Understand their genuine interest in technology, willingness to explore new concepts and motivation to continuously improve their technical knowledge.",
    weight: 10,
  },
  {
    id: "motivation_join_nexus",
    name: "Motivation to Join NEXUS",
    description:
      "Understand why they want to be an All-Rounder, what they expect to contribute and whether their motivation goes beyond gaining a position or certificate.",
    weight: 10,
  },
  {
    id: "collaboration_other_learners",
    name: "Collaboration with Other Learners",
    description:
      "Evaluate their ability to work with learners, support others, share knowledge and create a positive learning environment.",
    weight: 10,
  },
  {
    id: "genuine_contribution_intention_initiative",
    name: "Genuine Contribution Intention & Initiative",
    description:
      "Understand whether they genuinely want to contribute to NEXUS, take ownership of tasks, identify opportunities to help and step forward without constantly being pushed.",
    weight: 18,
  },
  {
    id: "contribution_learning_adaptability",
    name: "Contribution, Learning & Adaptability",
    description:
      "Evaluate their willingness to learn new skills required for club activities, accept feedback, adapt to different situations and handle unfamiliar responsibilities.",
    weight: 12,
  },
  {
    id: "past_experience_to_contribute",
    name: "Past Experience to Contribute",
    description:
      "Understand their previous experience and practical abilities in areas such as poster designing, graphic design, public speaking, content creation, event coordination, documentation and other relevant activities.",
    weight: 5,
  },
  {
    id: "taking_initiative",
    name: "Taking Initiative",
    description:
      "Understand whether they are willing to take sessions, coordinate learning activities, represent NEXUS at technical events or take responsibility when opportunities arise.",
    weight: 10,
  },
  {
    id: "external_tech_events",
    name: "External Tech Events",
    description:
      "Evaluate their willingness to participate in and represent NEXUS at external hackathons, workshops, competitions and technical events, subject to availability.",
    weight: 5,
  },
] as const;

export const ALL_ROUNDER_PATH: EvaluationPathConfig = {
  id: "all-rounder",
  name: "All-Rounder Path",
  purpose:
    "To understand whether the applicant is willing to go beyond learning and actively contribute to NEXUS while continuing their own technical growth.",
  criteria: ALL_ROUNDER_CRITERIA,
  dimensions: ALL_ROUNDER_CRITERIA,
} as const;

/**
 * PATH C — Contributor's Path (7 Criteria, Total Weight: 100)
 * Purpose: To evaluate applicants who are interested in contributing through specific skills,
 * responsibilities or non-technical and technical activities that support NEXUS.
 */
const CONTRIBUTOR_CRITERIA: readonly EvaluationCriterion[] = [
  {
    id: "culture",
    name: "Culture",
    description:
      "Understand whether the applicant respects NEXUS values, works well with different people and contributes to a healthy, supportive club environment.",
    weight: 10,
  },
  {
    id: "time_management",
    name: "Time Management",
    description:
      "Evaluate whether they can manage their assigned contributions alongside academics and personal commitments.",
    weight: 15,
  },
  {
    id: "responsibility",
    name: "Responsibility",
    description:
      "Understand whether the applicant can take ownership of assigned work, meet deadlines, maintain consistency and communicate when facing difficulties.",
    weight: 20,
  },
  {
    id: "motivation_join_nexus",
    name: "Motivation to Join NEXUS",
    description:
      "Understand why they want to contribute to NEXUS and whether their interest is genuinely connected to supporting the club and its activities.",
    weight: 10,
  },
  {
    id: "genuine_contribution_intention_initiative",
    name: "Genuine Contribution Intention & Initiative",
    description:
      "Evaluate whether they are willing to actively participate, identify areas where they can help and take initiative rather than waiting for instructions every time.",
    weight: 20,
  },
  {
    id: "contribution_learning_adaptability",
    name: "Contribution, Learning & Adaptability",
    description:
      "Understand their willingness to improve existing skills, learn new tools, accept feedback and adapt to the changing requirements of club activities.",
    weight: 15,
  },
  {
    id: "past_experience_to_contribute",
    name: "Past Experience to Contribute",
    description:
      "Understand their previous experience and practical abilities in areas such as poster designing, graphic design, public speaking, content creation, event coordination, documentation and other relevant activities.",
    weight: 10,
  },
] as const;

export const CONTRIBUTOR_PATH: EvaluationPathConfig = {
  id: "contributor",
  name: "Contributor's Path",
  purpose:
    "To evaluate applicants who are interested in contributing through specific skills, responsibilities or non-technical and technical activities that support NEXUS.",
  criteria: CONTRIBUTOR_CRITERIA,
  dimensions: CONTRIBUTOR_CRITERIA,
} as const;

export const PATH_CONFIGS: Readonly<Record<EvaluationPathId, EvaluationPathConfig>> = {
  learner: LEARNER_PATH,
  contributor: CONTRIBUTOR_PATH,
  "all-rounder": ALL_ROUNDER_PATH,
};

const ALL_CRITERIA_LIST: readonly EvaluationCriterion[] = [
  ...LEARNER_CRITERIA,
  ...ALL_ROUNDER_CRITERIA,
  ...CONTRIBUTOR_CRITERIA,
];

/**
 * Returns all configured evaluation paths.
 */
export function getAllPaths(): readonly EvaluationPathConfig[] {
  return [LEARNER_PATH, CONTRIBUTOR_PATH, ALL_ROUNDER_PATH];
}

/**
 * Normalizes an arbitrary path label, name, or ID into a canonical EvaluationPathId.
 */
export function normalizePathLabel(label: string | null | undefined): EvaluationPathId | null {
  if (typeof label !== "string") return null;

  const cleaned = label
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  if (!cleaned || cleaned.length > 50) return null;

  if (cleaned === "learner") return "learner";
  if (cleaned === "contributor") return "contributor";
  if (cleaned === "all-rounder" || cleaned === "allrounder" || cleaned === "all rounder")
    return "all-rounder";

  if (/^(?:all[\s-]?rounder(?:'?s)?(?:\s+path)?|all[\s-]?rounders)$/i.test(cleaned)) {
    return "all-rounder";
  }

  if (/^(?:contributor(?:'?s)?(?:\s+path)?|contributors(?:\s+path)?)$/i.test(cleaned)) {
    return "contributor";
  }

  if (/^(?:learner(?:'?s)?(?:\s+path)?|learners(?:\s+path)?)$/i.test(cleaned)) {
    return "learner";
  }

  return null;
}

/**
 * Looks up a path configuration by its canonical ID or display name.
 */
export function getPathConfig(pathId: string | null | undefined): EvaluationPathConfig | undefined {
  const canonical = normalizePathLabel(pathId);
  return canonical ? PATH_CONFIGS[canonical] : undefined;
}

/**
 * Returns all criteria belonging to a given path.
 */
export function getCriteriaForPath(
  pathId: string | null | undefined
): readonly EvaluationCriterion[] {
  const path = getPathConfig(pathId);
  return path ? path.criteria : [];
}

// Backward compatibility alias
export const getDimensionsForPath = getCriteriaForPath;

/**
 * Looks up a specific criterion by ID, optionally scoped to a path.
 */
export function getCriterionConfig(
  criterionId: string,
  pathId?: string | null | undefined
): EvaluationCriterion | undefined {
  if (!criterionId) return undefined;
  if (pathId) {
    const list = getCriteriaForPath(pathId);
    return list.find((c) => c.id === criterionId);
  }
  return ALL_CRITERIA_LIST.find((c) => c.id === criterionId);
}

// Backward compatibility alias
export const getDimensionConfig = getCriterionConfig;

/**
 * Validates the centralized path configurations against official requirements.
 * Verifies:
 * 1. Learner has exactly 7 criteria.
 * 2. All-Rounder has exactly 10 criteria.
 * 3. Contributor has exactly 7 criteria.
 * 4. Each path's weights sum to exactly 100.
 * 5. Criterion IDs are unique within each path.
 * 6. Every criterion has a non-empty name and description.
 * 7. All configured weights are positive numbers.
 */
export function validatePathConfigurations(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const expectedCounts: Record<EvaluationPathId, number> = {
    learner: 7,
    "all-rounder": 10,
    contributor: 7,
  };

  for (const pathId of EVALUATION_PATH_IDS) {
    const path = PATH_CONFIGS[pathId];
    if (!path) {
      errors.push(`Missing configuration for path "${pathId}"`);
      continue;
    }

    const expected = expectedCounts[pathId];
    if (path.criteria.length !== expected) {
      errors.push(
        `Path "${pathId}" has ${path.criteria.length} criteria, expected exactly ${expected}`
      );
    }

    const ids = new Set<string>();
    let totalWeight = 0;

    for (const c of path.criteria) {
      if (!c.id || typeof c.id !== "string" || !c.id.trim()) {
        errors.push(`Path "${pathId}" contains criterion with missing/empty id`);
      } else if (ids.has(c.id)) {
        errors.push(`Path "${pathId}" contains duplicate criterion id: "${c.id}"`);
      } else {
        ids.add(c.id);
      }

      if (!c.name || typeof c.name !== "string" || !c.name.trim()) {
        errors.push(`Path "${pathId}" criterion "${c.id}" has empty name`);
      }

      if (!c.description || typeof c.description !== "string" || !c.description.trim()) {
        errors.push(`Path "${pathId}" criterion "${c.id}" has empty description`);
      }

      if (typeof c.weight !== "number" || c.weight <= 0 || isNaN(c.weight)) {
        errors.push(`Path "${pathId}" criterion "${c.id}" has non-positive weight: ${c.weight}`);
      } else {
        totalWeight += c.weight;
      }
    }

    if (totalWeight !== 100) {
      errors.push(`Path "${pathId}" weights sum to ${totalWeight}, expected exactly 100`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Calculates the official weighted score for a single criterion:
 * Weighted Score = (Rating / 10) * Weight
 *
 * Ratings must be integers between 1 and 10.
 * If rating is null, unselected, or invalid, returns 0.
 * Deterministic and rounded to two decimal places.
 */
export function calculateWeightedScore(rating: number | null | undefined, weight: number): number {
  if (typeof rating !== "number" || isNaN(rating) || rating < 1 || rating > 10) {
    return 0;
  }
  const raw = (rating / 10) * weight;
  return Math.round(raw * 100) / 100;
}

export interface FinalScoreResult {
  totalWeightedScore: number;
  totalWeightedScoreFormatted: string;
  maxPossibleScore: number;
  isComplete: boolean;
  reviewedCount: number;
  totalCount: number;
}

/**
 * Calculates total weighted score across evaluated criteria.
 * Final score is the sum of all weighted scores (max 100).
 * isComplete is true ONLY when all criteria have an explicit integer rating (1 to 10).
 */
export function calculateFinalScore(
  items: Array<{ rating?: number | null; weight: number }>
): FinalScoreResult {
  let totalWeightedScore = 0;
  let reviewedCount = 0;
  const totalCount = items.length;

  for (const item of items) {
    const hasValidRating =
      typeof item.rating === "number" &&
      !isNaN(item.rating) &&
      item.rating >= 1 &&
      item.rating <= 10;

    if (hasValidRating) {
      reviewedCount++;
      totalWeightedScore += calculateWeightedScore(item.rating, item.weight);
    }
  }

  const roundedTotal = Math.round(totalWeightedScore * 100) / 100;
  const isComplete = totalCount > 0 && reviewedCount === totalCount;

  return {
    totalWeightedScore: roundedTotal,
    totalWeightedScoreFormatted: roundedTotal.toFixed(2),
    maxPossibleScore: 100,
    isComplete,
    reviewedCount,
    totalCount,
  };
}

/**
 * Factory helper: Initializes a complete official criteria evaluation snapshot for a path.
 * In the official rubric:
 * - NEVER preselect a rating (rating: null).
 * - Remove old default scores (reviewed: false).
 * - Requires explicit interviewer selection.
 */
export function createDefaultCriteriaEvaluation(
  pathId: string | null | undefined
): CriteriaEvaluationSnapshot | null {
  const pathConfig = getPathConfig(pathId);
  if (!pathConfig) return null;

  const criteriaItems: CriterionEvaluationItem[] = pathConfig.criteria.map((c) => ({
    id: c.id,
    dimensionId: c.id, // compatibility
    name: c.name,
    description: c.description,
    weight: c.weight,
    rating: null, // explicit null
    score: null, // compatibility
    weightedScore: 0,
    feedback: "",
    reviewed: false,
  }));

  return {
    rubricVersion: RUBRIC_VERSION,
    path: pathConfig.id,
    criteria: criteriaItems,
    dimensions: criteriaItems, // compatibility
    overallFeedback: "",
    totalWeightedScore: 0,
    isComplete: false,
    evaluatedAt: null,
  };
}

// Backward compatibility alias
export const createDefaultDimensionEvaluation = createDefaultCriteriaEvaluation;

/**
 * Converts any response structure (Map, plain object, null, undefined)
 * into a safe [header, value] string array.
 */
function extractResponsePairs(
  responses: Record<string, any> | Map<string, any> | null | undefined
): Array<[string, string]> {
  if (!responses) return [];

  if (responses instanceof Map) {
    return Array.from(responses.entries()).map(([k, v]) => [
      String(k ?? ""),
      typeof v === "string" ? v : v != null ? String(v) : "",
    ]);
  }

  if (typeof responses === "object") {
    return Object.entries(responses).map(([k, v]) => [
      String(k ?? ""),
      typeof v === "string" ? v : v != null ? String(v) : "",
    ]);
  }

  return [];
}

/**
 * Detects applicant path with rich metadata and confidence tier.
 */
export function detectApplicantPathDetails(
  responses: Record<string, any> | Map<string, any> | null | undefined
): PathDetectionResult {
  const pairs = extractResponsePairs(responses);
  if (pairs.length === 0) {
    return { path: null, confidence: "none" };
  }

  const priority1: Array<[string, string]> = [];
  const priority2: Array<[string, string]> = [];
  const priority3: Array<[string, string]> = [];
  const priority4: Array<[string, string]> = [];

  for (const [header, val] of pairs) {
    const h = header.toLowerCase();
    if (/(?:^|[^a-z0-9])path(?:$|[^a-z0-9])/i.test(h)) {
      priority1.push([header, val]);
    } else if (/(?:^|[^a-z0-9])(?:domain|role)(?:$|[^a-z0-9])/i.test(h)) {
      priority2.push([header, val]);
    } else if (h.includes("why do you want to join")) {
      priority3.push([header, val]);
    } else {
      priority4.push([header, val]);
    }
  }

  for (const [header, val] of priority1) {
    const detected = normalizePathLabel(val);
    if (detected) {
      return { path: detected, matchedHeader: header, rawValue: val, confidence: "high" };
    }
  }

  for (const [header, val] of priority2) {
    const detected = normalizePathLabel(val);
    if (detected) {
      return { path: detected, matchedHeader: header, rawValue: val, confidence: "high" };
    }
  }

  for (const [header, val] of priority3) {
    const detected = normalizePathLabel(val);
    if (detected) {
      return { path: detected, matchedHeader: header, rawValue: val, confidence: "high" };
    }
  }

  for (const [header, val] of priority4) {
    const h = header.toLowerCase();
    if (
      h.includes("roll") ||
      h.includes("mail") ||
      h.includes("phone") ||
      h.includes("contact") ||
      h.includes("gender")
    ) {
      continue;
    }
    const detected = normalizePathLabel(val);
    if (detected) {
      return { path: detected, matchedHeader: header, rawValue: val, confidence: "medium" };
    }
  }

  return { path: null, confidence: "none" };
}

/**
 * Automatic path detection helper:
 * Detects and returns the applicant's selected evaluation path ('learner' | 'contributor' | 'all-rounder')
 * from their form responses, or null if no valid path was selected or confidence is insufficient.
 */
export function detectApplicantPath(
  responses: Record<string, any> | Map<string, any> | null | undefined
): EvaluationPathId | null {
  return detectApplicantPathDetails(responses).path;
}
