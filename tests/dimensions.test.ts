import { test, describe } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  RUBRIC_VERSION,
  EVALUATION_PATH_IDS,
  LEARNER_PATH,
  CONTRIBUTOR_PATH,
  ALL_ROUNDER_PATH,
  PATH_CONFIGS,
  OFFICIAL_RATING_SCALE,
  getAllPaths,
  getPathConfig,
  getCriteriaForPath,
  getCriterionConfig,
  normalizePathLabel,
  validatePathConfigurations,
  calculateWeightedScore,
  calculateFinalScore,
  createDefaultCriteriaEvaluation,
  detectApplicantPath,
  detectApplicantPathDetails,
} from "../src/lib/dimensions.ts";
import Applicant, { CriteriaEvaluationSchema, CriterionEvaluationItemSchema } from "../src/models/Applicant.ts";
import Interview from "../src/models/Interview.ts";

describe("Rubric v2 Alignment — Evaluation Paths & Criteria Definition", () => {
  test("defines rubric version as nexus-interview-v2", () => {
    assert.equal(RUBRIC_VERSION, "nexus-interview-v2");
  });

  test("defines exactly three paths with stable IDs", () => {
    assert.deepEqual(EVALUATION_PATH_IDS, ["learner", "contributor", "all-rounder"]);
    const paths = getAllPaths();
    assert.equal(paths.length, 3);
    assert.equal(paths[0].id, "learner");
    assert.equal(paths[1].id, "contributor");
    assert.equal(paths[2].id, "all-rounder");
  });

  test("PATH A — Learner's Path has exactly 7 criteria with weights summing to 100", () => {
    const p = LEARNER_PATH;
    assert.equal(p.id, "learner");
    assert.equal(p.name, "Learner's Path");
    assert.equal(p.criteria.length, 7);

    const c = p.criteria;
    assert.equal(c[0].id, "culture");
    assert.equal(c[0].name, "Culture");
    assert.equal(c[0].weight, 10);

    assert.equal(c[1].id, "time_management_commitments");
    assert.equal(c[1].name, "Time Management & Commitments");
    assert.equal(c[1].weight, 15);

    assert.equal(c[2].id, "curiosity_interest_tech");
    assert.equal(c[2].name, "Curiosity & Interest in Tech");
    assert.equal(c[2].weight, 20);

    assert.equal(c[3].id, "motivation_join_nexus");
    assert.equal(c[3].name, "Motivation to Join NEXUS");
    assert.equal(c[3].weight, 15);

    assert.equal(c[4].id, "collaboration_other_learners");
    assert.equal(c[4].name, "Collaboration with Other Learners");
    assert.equal(c[4].weight, 15);

    assert.equal(c[5].id, "taking_initiative");
    assert.equal(c[5].name, "Taking Initiative");
    assert.equal(c[5].weight, 15);

    assert.equal(c[6].id, "external_tech_events");
    assert.equal(c[6].name, "External Tech Events");
    assert.equal(c[6].weight, 10);

    const totalWeight = c.reduce((sum, item) => sum + item.weight, 0);
    assert.equal(totalWeight, 100);
  });

  test("PATH B — All-Rounder's Path has exactly 10 criteria with weights summing to 100", () => {
    const p = ALL_ROUNDER_PATH;
    assert.equal(p.id, "all-rounder");
    assert.equal(p.name, "All-Rounder Path");
    assert.equal(p.criteria.length, 10);

    const c = p.criteria;
    assert.equal(c[0].id, "time_management_commitments");
    assert.equal(c[0].weight, 10);

    assert.equal(c[1].id, "culture");
    assert.equal(c[1].weight, 10);

    assert.equal(c[2].id, "curiosity_interest_tech");
    assert.equal(c[2].weight, 10);

    assert.equal(c[3].id, "motivation_join_nexus");
    assert.equal(c[3].weight, 10);

    assert.equal(c[4].id, "collaboration_other_learners");
    assert.equal(c[4].weight, 10);

    assert.equal(c[5].id, "genuine_contribution_intention_initiative");
    assert.equal(c[5].weight, 18);

    assert.equal(c[6].id, "contribution_learning_adaptability");
    assert.equal(c[6].weight, 12);

    assert.equal(c[7].id, "past_experience_to_contribute");
    assert.equal(c[7].weight, 5);

    assert.equal(c[8].id, "taking_initiative");
    assert.equal(c[8].weight, 10);

    assert.equal(c[9].id, "external_tech_events");
    assert.equal(c[9].weight, 5);

    const totalWeight = c.reduce((sum, item) => sum + item.weight, 0);
    assert.equal(totalWeight, 100);
  });

  test("PATH C — Contributor's Path has exactly 7 criteria with weights summing to 100", () => {
    const p = CONTRIBUTOR_PATH;
    assert.equal(p.id, "contributor");
    assert.equal(p.name, "Contributor's Path");
    assert.equal(p.criteria.length, 7);

    const c = p.criteria;
    assert.equal(c[0].id, "culture");
    assert.equal(c[0].weight, 10);

    assert.equal(c[1].id, "time_management");
    assert.equal(c[1].weight, 15);

    assert.equal(c[2].id, "responsibility");
    assert.equal(c[2].weight, 20);

    assert.equal(c[3].id, "motivation_join_nexus");
    assert.equal(c[3].weight, 10);

    assert.equal(c[4].id, "genuine_contribution_intention_initiative");
    assert.equal(c[4].weight, 20);

    assert.equal(c[5].id, "contribution_learning_adaptability");
    assert.equal(c[5].weight, 15);

    assert.equal(c[6].id, "past_experience_to_contribute");
    assert.equal(c[6].weight, 10);

    const totalWeight = c.reduce((sum, item) => sum + item.weight, 0);
    assert.equal(totalWeight, 100);
  });

  test("validatePathConfigurations passes all checks with zero errors", () => {
    const res = validatePathConfigurations();
    assert.equal(res.valid, true);
    assert.deepEqual(res.errors, []);
  });
});

describe("Rubric v2 Alignment — Scoring Formula & Calculation", () => {
  test("calculateWeightedScore: (Rating / 10) * Weight rounded to 2 decimals", () => {
    // Exact examples from rubric
    assert.equal(calculateWeightedScore(8, 20), 16.0);
    assert.equal(calculateWeightedScore(7, 15), 10.5);
    assert.equal(calculateWeightedScore(10, 5), 5.0);
    assert.equal(calculateWeightedScore(1, 10), 1.0);
    assert.equal(calculateWeightedScore(9, 18), 16.2);
    assert.equal(calculateWeightedScore(6, 12), 7.2);

    // Rounding check
    assert.equal(calculateWeightedScore(7, 18), 12.6);

    // Edge cases: null, undefined, invalid, out of range [1-10]
    assert.equal(calculateWeightedScore(null, 20), 0);
    assert.equal(calculateWeightedScore(undefined, 20), 0);
    assert.equal(calculateWeightedScore(0, 20), 0);
    assert.equal(calculateWeightedScore(11, 20), 0);
    assert.equal(calculateWeightedScore(-5, 20), 0);
    assert.equal(calculateWeightedScore(NaN, 20), 0);
  });

  test("calculateFinalScore returns exact 100.00 when all criteria rated 10 across any path", () => {
    for (const pathId of EVALUATION_PATH_IDS) {
      const criteria = getCriteriaForPath(pathId);
      const items = criteria.map((c) => ({
        rating: 10,
        weight: c.weight,
      }));

      const res = calculateFinalScore(items);
      assert.equal(res.totalWeightedScore, 100.0);
      assert.equal(res.totalWeightedScoreFormatted, "100.00");
      assert.equal(res.maxPossibleScore, 100);
      assert.equal(res.isComplete, true);
      assert.equal(res.reviewedCount, criteria.length);
      assert.equal(res.totalCount, criteria.length);
    }
  });

  test("calculateFinalScore handles partial/incomplete ratings correctly", () => {
    const items = [
      { rating: 8, weight: 20 }, // 16.0
      { rating: 6, weight: 15 }, // 9.0
      { rating: null, weight: 10 }, // 0
      { rating: undefined, weight: 15 }, // 0
    ];

    const res = calculateFinalScore(items);
    assert.equal(res.totalWeightedScore, 25.0);
    assert.equal(res.isComplete, false);
    assert.equal(res.reviewedCount, 2);
    assert.equal(res.totalCount, 4);
  });

  test("OFFICIAL_RATING_SCALE contains all 5 official tiers", () => {
    assert.equal(OFFICIAL_RATING_SCALE.length, 5);
    assert.deepEqual(
      OFFICIAL_RATING_SCALE.map((s) => s.label),
      ["Poor", "Below Expectations", "Satisfactory", "Good", "Excellent"]
    );
    assert.equal(OFFICIAL_RATING_SCALE[0].range, "1–2");
    assert.equal(OFFICIAL_RATING_SCALE[1].range, "3–4");
    assert.equal(OFFICIAL_RATING_SCALE[2].range, "5–6");
    assert.equal(OFFICIAL_RATING_SCALE[3].range, "7–8");
    assert.equal(OFFICIAL_RATING_SCALE[4].range, "9–10");
  });

  test("createDefaultCriteriaEvaluation initializes unrated criteria with rating: null and reviewed: false", () => {
    const snapshot = createDefaultCriteriaEvaluation("learner");
    assert.ok(snapshot);
    assert.equal(snapshot.rubricVersion, "nexus-interview-v2");
    assert.equal(snapshot.path, "learner");
    assert.equal(snapshot.criteria.length, 7);
    assert.equal(snapshot.overallFeedback, "");
    assert.equal(snapshot.totalWeightedScore, 0);
    assert.equal(snapshot.isComplete, false);
    assert.equal(snapshot.evaluatedAt, null);

    // Must NEVER preselect ratings (no default 7/8 scores)
    for (const c of snapshot.criteria) {
      assert.equal(c.rating, null, `Criterion ${c.id} must have rating: null`);
      assert.equal(c.reviewed, false, `Criterion ${c.id} must not be marked reviewed`);
      assert.equal(c.weightedScore, 0, `Criterion ${c.id} must have weightedScore: 0`);
      assert.equal(c.feedback, "");
      assert.ok(c.weight > 0);
    }
  });
});

describe("Rubric v2 Alignment — Configuration Helpers & Lookup", () => {
  test("getPathConfig looks up path by canonical ID or name", () => {
    assert.equal(getPathConfig("learner")?.id, "learner");
    assert.equal(getPathConfig("Learner's Path")?.id, "learner");
    assert.equal(getPathConfig("Learner’s Path")?.id, "learner");
    assert.equal(getPathConfig("contributor")?.id, "contributor");
    assert.equal(getPathConfig("Contributor's Path")?.id, "contributor");
    assert.equal(getPathConfig("all-rounder")?.id, "all-rounder");
    assert.equal(getPathConfig("All Rounder Path")?.id, "all-rounder");
    assert.equal(getPathConfig("invalid"), undefined);
    assert.equal(getPathConfig(null), undefined);
  });

  test("getCriteriaForPath returns criteria for valid path and [] for invalid", () => {
    assert.equal(getCriteriaForPath("learner").length, 7);
    assert.equal(getCriteriaForPath("contributor").length, 7);
    assert.equal(getCriteriaForPath("all-rounder").length, 10);
    assert.equal(getCriteriaForPath("unknown").length, 0);
  });

  test("getCriterionConfig looks up criteria globally or per-path", () => {
    const c1 = getCriterionConfig("culture");
    assert.ok(c1);
    assert.equal(c1?.name, "Culture");

    const c2 = getCriterionConfig("responsibility", "contributor");
    assert.ok(c2);
    assert.equal(c2?.weight, 20);

    // Looking up contributor criterion under learner path should return undefined
    const c3 = getCriterionConfig("responsibility", "learner");
    assert.equal(c3, undefined);
  });
});

describe("Path Label Normalization & Automatic Path Detection", () => {
  test("normalizePathLabel handles straight/curly apostrophes, case, spaces, and hyphens", () => {
    assert.equal(normalizePathLabel("Learner's Path"), "learner");
    assert.equal(normalizePathLabel("Learner’s Path"), "learner");
    assert.equal(normalizePathLabel("learners path"), "learner");
    assert.equal(normalizePathLabel("LEARNER"), "learner");

    assert.equal(normalizePathLabel("Contributor's Path"), "contributor");
    assert.equal(normalizePathLabel("Contributor’s Path"), "contributor");
    assert.equal(normalizePathLabel("contributors path"), "contributor");
    assert.equal(normalizePathLabel("CONTRIBUTOR"), "contributor");

    assert.equal(normalizePathLabel("All-Rounder Path"), "all-rounder");
    assert.equal(normalizePathLabel("All Rounder Path"), "all-rounder");
    assert.equal(normalizePathLabel("all-rounder"), "all-rounder");
    assert.equal(normalizePathLabel("All Rounder"), "all-rounder");
    assert.equal(normalizePathLabel("allrounder"), "all-rounder");
    assert.equal(normalizePathLabel("  All   Rounder   Path  "), "all-rounder");

    assert.equal(normalizePathLabel(""), null);
    assert.equal(normalizePathLabel("   "), null);
    assert.equal(normalizePathLabel(null), null);
    assert.equal(normalizePathLabel(undefined), null);
    assert.equal(normalizePathLabel("Random Role"), null);
  });

  test("detectApplicantPath detects paths from actual Google Sheets response questions", () => {
    assert.equal(
      detectApplicantPath({ "Which NEXUS Path do you want to enroll in?": "Learner’s Path" }),
      "learner"
    );
    assert.equal(
      detectApplicantPath({ "Which NEXUS Path do you want to enroll in?": "Contributor’s Path" }),
      "contributor"
    );
    assert.equal(
      detectApplicantPath({ "Which NEXUS Path do you want to enroll in?": "All-Rounder Path" }),
      "all-rounder"
    );

    assert.equal(
      detectApplicantPath({ "Why do you want to join NEXUS?": "All Rounder Path" }),
      "all-rounder"
    );
    assert.equal(
      detectApplicantPath({ "Why do you want to join NEXUS?": "Learner’s Path" }),
      "learner"
    );

    const mapResponses = new Map<string, string>([
      ["Timestamp", "23/10/2025 11:38:33"],
      ["Which NEXUS Path do you want to enroll in?", "Contributor’s Path"],
    ]);
    assert.equal(detectApplicantPath(mapResponses), "contributor");
  });

  test("detectApplicantPath avoids false positives and never confuses 'enroll' or 'roll'", () => {
    assert.equal(detectApplicantPath({ "Any Question": "enroll" }), null);
    assert.equal(detectApplicantPath({ "Enrollment Status": "Enrolled" }), null);
    assert.equal(
      detectApplicantPath({ "ROLL NUMBER :  Example: 23081A7301": "24081A05F7" }),
      null
    );

    const essay =
      "I want to join NEXUS because I believe it is a great platform to improve my technical skills, explore new technologies, and work on real-world projects.";
    assert.equal(
      detectApplicantPath({
        "Why do you want to join NEXUS, and what makes you different from other classmates?": essay,
      }),
      null
    );

    assert.equal(detectApplicantPath({}), null);
    assert.equal(detectApplicantPath(null), null);
    assert.equal(detectApplicantPath(undefined), null);
  });

  test("detectApplicantPathDetails returns metadata and confidence", () => {
    const res = detectApplicantPathDetails({
      "Which NEXUS Path do you want to enroll in?": "Learner’s Path",
    });
    assert.equal(res.path, "learner");
    assert.equal(res.confidence, "high");
    assert.equal(res.matchedHeader, "Which NEXUS Path do you want to enroll in?");
    assert.equal(res.rawValue, "Learner’s Path");
  });
});

describe("Model Schema Compatibility & Historical Preservation", () => {
  test("Applicant schema contains criteriaEvaluation and appliedPath", () => {
    const schema = Applicant.schema as any;
    assert.ok(schema.paths["appliedPath"], "Applicant schema must include appliedPath");
    assert.ok(schema.paths["criteriaEvaluation"], "Applicant schema must include criteriaEvaluation");

    const subpaths = schema.path("criteriaEvaluation").schema.paths;
    assert.ok(subpaths["rubricVersion"], "criteriaEvaluation subschema must include rubricVersion");
    assert.ok(subpaths["path"], "criteriaEvaluation subschema must include path");
    assert.ok(subpaths["criteria"], "criteriaEvaluation subschema must include criteria");
    assert.ok(subpaths["totalWeightedScore"], "criteriaEvaluation subschema must include totalWeightedScore");
    assert.ok(subpaths["isComplete"], "criteriaEvaluation subschema must include isComplete");
    assert.ok(subpaths["evaluatedAt"], "criteriaEvaluation subschema must include evaluatedAt");

    // Legacy fields preserved
    assert.ok(schema.paths["dimensionEvaluation"], "dimensionEvaluation must exist for backwards compatibility");
    assert.ok(schema.paths["evaluation.technical"], "Legacy evaluation.technical must exist");
    assert.ok(schema.paths["evaluation.communication"], "Legacy evaluation.communication must exist");
  });

  test("Interview schema contains criteriaEvaluation alongside legacy ratings", () => {
    const schema = Interview.schema as any;
    assert.ok(schema.paths["criteriaEvaluation"], "Interview schema must include criteriaEvaluation");

    const subpaths = schema.path("criteriaEvaluation").schema.paths;
    assert.ok(subpaths["rubricVersion"], "criteriaEvaluation subschema must include rubricVersion");
    assert.ok(subpaths["path"], "criteriaEvaluation subschema must include path");
    assert.ok(subpaths["criteria"], "criteriaEvaluation subschema must include criteria");

    // Legacy ratings preserved
    assert.ok(schema.paths["ratings.technical"], "Legacy ratings.technical must exist");
    assert.ok(schema.paths["ratings.communication"], "Legacy ratings.communication must exist");
  });

  test("instantiating an applicant without criteriaEvaluation leaves it undefined", () => {
    const doc = new Applicant({
      name: "Test Applicant",
      rollNumber: "TEST001",
    });
    assert.equal(doc.criteriaEvaluation, undefined);
  });

  test("validates criterion rating range [1-10] and required id", () => {
    const doc = new Applicant({
      name: "Test Applicant",
      rollNumber: "TEST002",
      criteriaEvaluation: {
        rubricVersion: "nexus-interview-v2",
        path: "learner",
        criteria: [
          {
            id: "culture",
            name: "Culture",
            weight: 10,
            rating: 11, // Invalid: exceeds 10
            weightedScore: 0,
            feedback: "",
            reviewed: false,
          },
        ],
      },
    });

    const err = doc.validateSync();
    assert.ok(err, "Must fail validation when rating > 10");
    assert.ok(err?.errors["criteriaEvaluation.criteria.0.rating"]);
  });
});
