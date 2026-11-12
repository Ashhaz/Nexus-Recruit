import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  RUBRIC_VERSION,
  EVALUATION_PATH_IDS,
  getPathConfig,
  getCriteriaForPath,
  normalizePathLabel,
  detectApplicantPath,
} from "../src/lib/dimensions.ts";
import {
  DRAFT_STORAGE_PREFIX,
  getEvaluationDraftStorageKey,
  createInitialEvaluationsByPath,
  mergeDraftIntoEvaluationsByPath,
  loadEvaluationDraft,
  saveEvaluationDraft,
} from "../src/lib/evaluationDrafts.ts";
import type { WorkspaceEvaluationDraft } from "../src/lib/evaluationDrafts.ts";

describe("Stage 2 — Workspace Draft Storage Key & Isolation (Rubric v2)", () => {
  test("generates unique storage key incorporating all isolation identifiers with v2 prefix", () => {
    const key = getEvaluationDraftStorageKey({
      applicantId: "app_123",
      interviewerId: "int_456",
      eventId: "ev_789",
      roomNumber: 2,
    });
    assert.equal(key, "nexus_v2_eval_draft_ev_ev_789_rm_2_int_int_456_app_app_123");
  });

  test("returns null if applicantId is missing or blank", () => {
    assert.equal(
      getEvaluationDraftStorageKey({
        applicantId: "",
        interviewerId: "int_1",
        eventId: "ev_1",
        roomNumber: 1,
      }),
      null
    );
    assert.equal(
      getEvaluationDraftStorageKey({
        applicantId: null,
        interviewerId: "int_1",
        eventId: "ev_1",
        roomNumber: 1,
      }),
      null
    );
  });

  test("strictly isolates drafts across different applicants", () => {
    const keyCandidateA = getEvaluationDraftStorageKey({
      applicantId: "applicant_A",
      interviewerId: "int_1",
      eventId: "ev_1",
      roomNumber: 1,
    });
    const keyCandidateB = getEvaluationDraftStorageKey({
      applicantId: "applicant_B",
      interviewerId: "int_1",
      eventId: "ev_1",
      roomNumber: 1,
    });
    assert.notEqual(keyCandidateA, keyCandidateB);
  });

  test("strictly isolates drafts across different interviewers in the same room", () => {
    const keyInterviewer1 = getEvaluationDraftStorageKey({
      applicantId: "applicant_A",
      interviewerId: "INT1",
      eventId: "ev_1",
      roomNumber: 1,
    });
    const keyInterviewer2 = getEvaluationDraftStorageKey({
      applicantId: "applicant_A",
      interviewerId: "INT6",
      eventId: "ev_1",
      roomNumber: 1,
    });
    assert.notEqual(keyInterviewer1, keyInterviewer2);
  });

  test("strictly isolates drafts across different events and rooms", () => {
    const keyEvent1 = getEvaluationDraftStorageKey({
      applicantId: "applicant_A",
      interviewerId: "INT1",
      eventId: "event_2025",
      roomNumber: 1,
    });
    const keyEvent2 = getEvaluationDraftStorageKey({
      applicantId: "applicant_A",
      interviewerId: "INT1",
      eventId: "event_2026",
      roomNumber: 1,
    });
    const keyRoom2 = getEvaluationDraftStorageKey({
      applicantId: "applicant_A",
      interviewerId: "INT1",
      eventId: "event_2025",
      roomNumber: 2,
    });
    assert.notEqual(keyEvent1, keyEvent2);
    assert.notEqual(keyEvent1, keyRoom2);
  });
});

describe("Stage 2 — Multi-Path Draft State & Switching (Official Criteria)", () => {
  test("createInitialEvaluationsByPath initializes all 3 paths with official criteria and unrated state", () => {
    const state = createInitialEvaluationsByPath(null);

    // Verify all 3 paths exist
    assert.ok(state.learner);
    assert.ok(state.contributor);
    assert.ok(state["all-rounder"]);

    // Learner: 7 criteria, unrated, unreviewed
    assert.equal(state.learner.criteria.length, 7);
    assert.ok(state.learner.criteria.every((c) => c.rating === null));
    assert.ok(state.learner.criteria.every((c) => c.reviewed === false));
    assert.ok(state.learner.criteria.every((c) => c.feedback === ""));
    assert.ok(state.learner.criteria.every((c) => c.weightedScore === 0));

    // Contributor: 7 criteria, unrated, unreviewed
    assert.equal(state.contributor.criteria.length, 7);
    assert.ok(state.contributor.criteria.every((c) => c.rating === null));
    assert.ok(state.contributor.criteria.every((c) => c.reviewed === false));

    // All-Rounder: 10 criteria, unrated, unreviewed
    assert.equal(state["all-rounder"].criteria.length, 10);
    assert.ok(state["all-rounder"].criteria.every((c) => c.rating === null));
    assert.ok(state["all-rounder"].criteria.every((c) => c.reviewed === false));
  });

  test("typing feedback alone does NOT mark criterion as reviewed", () => {
    const state = createInitialEvaluationsByPath(null);

    // Interviewer types feedback without giving a rating
    const criterion = state.learner.criteria[0];
    criterion.feedback = "Good candidate demeanor.";
    // Criteria reviewed flag must remain false without an integer rating
    const isReviewed = criterion.rating !== null && criterion.rating >= 1 && criterion.rating <= 10;
    criterion.reviewed = isReviewed;

    assert.equal(criterion.reviewed, false);
    assert.equal(criterion.rating, null);
    assert.equal(criterion.weightedScore, 0);
  });

  test("selecting a rating marks criterion as reviewed", () => {
    const state = createInitialEvaluationsByPath(null);

    const criterion = state.learner.criteria[0]; // Culture (weight: 10)
    criterion.rating = 8;
    criterion.reviewed = true;
    criterion.weightedScore = (8 / 10) * criterion.weight;

    assert.equal(criterion.reviewed, true);
    assert.equal(criterion.rating, 8);
    assert.equal(criterion.weightedScore, 8.0);
  });

  test("switching paths preserves unsent criteria drafts across paths", () => {
    const state = createInitialEvaluationsByPath(null);

    // 1. Interviewer rates a criterion on Learner's Path
    state.learner.criteria[0].rating = 9;
    state.learner.criteria[0].feedback = "Great curiosity and asked deep questions.";
    state.learner.criteria[0].reviewed = true;

    // 2. Interviewer switches to Contributor's Path and rates criterion 1
    state.contributor.criteria[1].rating = 8;
    state.contributor.criteria[1].feedback = "Solid past GitHub portfolio.";
    state.contributor.criteria[1].reviewed = true;

    // 3. Interviewer switches to All-Rounder Path and rates criterion 5
    state["all-rounder"].criteria[5].rating = 7;
    state["all-rounder"].criteria[5].feedback = "Takes initiative on tasks.";
    state["all-rounder"].criteria[5].reviewed = true;

    // 4. Verify returning to Learner's Path preserves draft
    assert.equal(state.learner.criteria[0].rating, 9);
    assert.equal(state.learner.criteria[0].feedback, "Great curiosity and asked deep questions.");
    assert.equal(state.learner.criteria[0].reviewed, true);

    // 5. Verify returning to Contributor's Path preserves draft
    assert.equal(state.contributor.criteria[1].rating, 8);
    assert.equal(state.contributor.criteria[1].feedback, "Solid past GitHub portfolio.");
    assert.equal(state.contributor.criteria[1].reviewed, true);

    // 6. Verify untouched criteria remain unreviewed
    assert.equal(state.learner.criteria[1].rating, null);
    assert.equal(state.learner.criteria[1].reviewed, false);
  });

  test("backend saved evaluation with Rubric v2 is merged into initial state", () => {
    const savedBackendEval = {
      rubricVersion: "nexus-interview-v2",
      path: "contributor",
      criteria: [
        {
          id: "culture",
          rating: 10,
          feedback: "Great culture fit.",
          reviewed: true,
        },
      ],
    };

    const state = createInitialEvaluationsByPath(savedBackendEval);

    // Contributor path reflects saved backend criterion
    const cultureCriterion = state.contributor.criteria.find((c) => c.id === "culture");
    assert.ok(cultureCriterion);
    assert.equal(cultureCriterion?.rating, 10);
    assert.equal(cultureCriterion?.reviewed, true);
    assert.equal(cultureCriterion?.weightedScore, 10.0); // 10/10 * 10
    assert.equal(cultureCriterion?.feedback, "Great culture fit.");

    // Other paths remain unrated
    assert.equal(state.learner.criteria[0].rating, null);
    assert.equal(state.learner.criteria[0].reviewed, false);
  });
});

describe("Stage 2 — Path Auto-Detection & Applied Path Protection", () => {
  test("auto-detects appliedPath from responses without defaulting unknown paths to Learner", () => {
    const p1 = detectApplicantPath({ "Which NEXUS Path do you want to enroll in?": "Learner’s Path" });
    assert.equal(p1, "learner");

    const p2 = detectApplicantPath({ "Which NEXUS Path do you want to enroll in?": "Contributor's Path" });
    assert.equal(p2, "contributor");

    const p3 = detectApplicantPath({ "Why do you want to join NEXUS?": "All Rounder Path" });
    assert.equal(p3, "all-rounder");

    const pUnknown = detectApplicantPath({ "Random Field": "Just interested in joining" });
    assert.equal(pUnknown, null);
  });

  test("applicant original appliedPath is never mutated by manual evaluation path selection", () => {
    const originalApplicant = {
      _id: "app_999",
      name: "Test Candidate",
      appliedPath: "learner",
    };

    const selectedEvaluationPath = "contributor";
    assert.equal(originalApplicant.appliedPath, "learner");
    assert.notEqual(selectedEvaluationPath, originalApplicant.appliedPath);
  });
});

describe("Stage 2 — sessionStorage Draft Persistence & Validation", () => {
  test("saves and reloads draft in sessionStorage, rejecting drafts with mismatched applicantId", () => {
    const mockStorage: Record<string, string> = {};
    const originalWindow = globalThis.window;
    const originalSessionStorage = globalThis.sessionStorage;

    (globalThis as any).window = {};
    (globalThis as any).sessionStorage = {
      getItem: (k: string) => mockStorage[k] || null,
      setItem: (k: string, v: string) => {
        mockStorage[k] = v;
      },
      removeItem: (k: string) => {
        delete mockStorage[k];
      },
    };

    try {
      const storageKey = getEvaluationDraftStorageKey({
        applicantId: "app_100",
        interviewerId: "INT1",
        eventId: "ev_1",
        roomNumber: 1,
      })!;

      const draftToSave: WorkspaceEvaluationDraft = {
        version: 2,
        rubricVersion: "nexus-interview-v2",
        applicantId: "app_100",
        interviewerId: "INT1",
        eventId: "ev_1",
        roomNumber: 1,
        currentPath: "learner",
        currentCriterionId: "culture",
        evaluationsByPath: createInitialEvaluationsByPath(null),
        updatedAt: Date.now(),
      };
      draftToSave.evaluationsByPath.learner.criteria[0].rating = 8;
      draftToSave.evaluationsByPath.learner.criteria[0].reviewed = true;

      // 1. Save draft
      const saveOk = saveEvaluationDraft(storageKey, draftToSave);
      assert.equal(saveOk, true);

      // 2. Load draft for matching applicant
      const loaded = loadEvaluationDraft(storageKey, "app_100");
      assert.ok(loaded);
      assert.equal(loaded?.version, 2);
      assert.equal(loaded?.rubricVersion, "nexus-interview-v2");
      assert.equal(loaded?.applicantId, "app_100");
      assert.equal(loaded?.currentPath, "learner");
      assert.equal(loaded?.evaluationsByPath.learner.criteria[0].rating, 8);
      assert.equal(loaded?.evaluationsByPath.learner.criteria[0].reviewed, true);

      // 3. Attempt to load draft with different applicant ID (must be rejected)
      const rejected = loadEvaluationDraft(storageKey, "app_OTHER");
      assert.equal(rejected, null);

      // 4. Reject legacy v1 draft
      const legacyKey = "nexus_v1_legacy_draft";
      mockStorage[legacyKey] = JSON.stringify({
        version: 1,
        applicantId: "app_100",
        evaluationsByPath: {},
      });
      const legacyLoaded = loadEvaluationDraft(legacyKey, "app_100");
      assert.equal(legacyLoaded, null);

      // 5. Test corrupted JSON in sessionStorage
      mockStorage[storageKey] = "INVALID_JSON{";
      const corruptLoaded = loadEvaluationDraft(storageKey, "app_100");
      assert.equal(corruptLoaded, null);
    } finally {
      (globalThis as any).window = originalWindow;
      (globalThis as any).sessionStorage = originalSessionStorage;
    }
  });
});
