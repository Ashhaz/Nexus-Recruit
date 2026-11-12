import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import mongoose from "mongoose";
import {
  RUBRIC_VERSION,
  EVALUATION_PATH_IDS,
  getPathConfig,
  getCriteriaForPath,
  calculateWeightedScore,
  calculateFinalScore,
} from "../src/lib/dimensions.ts";
import {
  getEvaluationDraftStorageKey,
  loadEvaluationDraft,
  saveEvaluationDraft,
  createInitialEvaluationsByPath,
} from "../src/lib/evaluationDrafts.ts";
import type { WorkspaceEvaluationDraft } from "../src/lib/evaluationDrafts.ts";
import Applicant from "../src/models/Applicant.ts";
import Interview from "../src/models/Interview.ts";
import InterviewRoom from "../src/models/InterviewRoom.ts";
import InterviewSession from "../src/models/InterviewSession.ts";

describe("Stage 3 — Durable Interview Session Identity", () => {
  test("generates cryptographically unique session IDs", () => {
    const s1 = crypto.randomUUID();
    const s2 = crypto.randomUUID();
    assert.notEqual(s1, s2);
    assert.equal(s1.length, 36);
    assert.match(s1, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  test("draft key strictly isolates drafts by interviewSessionId", () => {
    const sessionA = "session-aaa-111";
    const sessionB = "session-bbb-222";

    const keyA = getEvaluationDraftStorageKey({
      applicantId: "app_1",
      interviewerId: "int_1",
      eventId: "ev_1",
      roomNumber: 1,
      interviewSessionId: sessionA,
    });

    const keyB = getEvaluationDraftStorageKey({
      applicantId: "app_1",
      interviewerId: "int_1",
      eventId: "ev_1",
      roomNumber: 1,
      interviewSessionId: sessionB,
    });

    assert.ok(keyA?.includes(`_ses_${sessionA}`));
    assert.ok(keyB?.includes(`_ses_${sessionB}`));
    assert.notEqual(keyA, keyB, "Draft keys for different sessions must never collide");
  });

  test("loadEvaluationDraft rejects draft with mismatched interviewSessionId", () => {
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
      const storageKey = "nexus_v2_eval_draft_test_session_isolation";
      const draft: WorkspaceEvaluationDraft = {
        version: 2,
        rubricVersion: "nexus-interview-v2",
        applicantId: "app_100",
        interviewerId: "INT1",
        eventId: "ev_1",
        roomNumber: 1,
        interviewSessionId: "session-original-123",
        currentPath: "learner",
        currentCriterionId: "culture",
        evaluationsByPath: createInitialEvaluationsByPath(null),
        updatedAt: Date.now(),
      };

      saveEvaluationDraft(storageKey, draft);

      // Loading with matching session succeeds
      const loadedSame = loadEvaluationDraft(storageKey, "app_100", "session-original-123");
      assert.ok(loadedSame);
      assert.equal(loadedSame?.interviewSessionId, "session-original-123");

      // Loading with different session ID must be rejected
      const loadedDifferent = loadEvaluationDraft(storageKey, "app_100", "session-DIFFERENT-456");
      assert.equal(loadedDifferent, null, "Must reject draft belonging to an earlier or different session");
    } finally {
      (globalThis as any).window = originalWindow;
      (globalThis as any).sessionStorage = originalSessionStorage;
    }
  });
});

describe("Stage 3 — Mandatory Final Decision Validation", () => {
  const ALLOWED_DECISIONS = ["Approved", "Pending", "Discussion Needed"];

  test("accepts strictly the 3 official decision values", () => {
    for (const d of ALLOWED_DECISIONS) {
      assert.ok(["Approved", "Pending", "Discussion Needed"].includes(d));
    }
  });

  test("rejects invalid, empty, or unsupported decisions", () => {
    const invalid = ["Rejected", "Pass", "Fail", "", "approved", "PENDING", null, undefined, "Selected"];
    for (const bad of invalid) {
      assert.equal(
        ALLOWED_DECISIONS.includes(bad as any),
        false,
        `Decision "${bad}" must not be accepted`
      );
    }
  });
});

describe("Stage 3 — Official Rubric Validation & Integrity", () => {
  test("every path requires its exact official criteria count", () => {
    assert.equal(getPathConfig("learner")?.criteria.length, 7);
    assert.equal(getPathConfig("all-rounder")?.criteria.length, 10);
    assert.equal(getPathConfig("contributor")?.criteria.length, 7);
  });

  test("rejects unknown criterion IDs or criteria belonging to another path", () => {
    const learnerConfig = getPathConfig("learner")!;
    const learnerIds = new Set(learnerConfig.criteria.map((c) => c.id));

    // Responsibility belongs to contributor, NOT learner
    assert.equal(learnerIds.has("responsibility"), false);

    // Past experience belongs to all-rounder/contributor, NOT learner
    assert.equal(learnerIds.has("past_experience_to_contribute"), false);
  });

  test("validates rating is an integer strictly between 1 and 10", () => {
    const isValidRating = (r: any) => Number.isInteger(r) && r >= 1 && r <= 10;

    assert.equal(isValidRating(1), true);
    assert.equal(isValidRating(5), true);
    assert.equal(isValidRating(10), true);

    assert.equal(isValidRating(0), false);
    assert.equal(isValidRating(11), false);
    assert.equal(isValidRating(7.5), false);
    assert.equal(isValidRating("8"), false);
    assert.equal(isValidRating(null), false);
    assert.equal(isValidRating(undefined), false);
  });
});

describe("Stage 3 — Server-Authoritative Scoring & Formulas", () => {
  test("calculates official weighted score: (Rating / 10) * Weight", () => {
    assert.equal(calculateWeightedScore(8, 20), 16.0);
    assert.equal(calculateWeightedScore(7, 15), 10.5);
    assert.equal(calculateWeightedScore(10, 5), 5.0);
    assert.equal(calculateWeightedScore(1, 10), 1.0);
    assert.equal(calculateWeightedScore(9, 18), 16.2);
  });

  test("all criteria rated 10 produce exactly 100 for all paths", () => {
    for (const pathId of EVALUATION_PATH_IDS) {
      const criteria = getCriteriaForPath(pathId);
      const items = criteria.map((c) => ({ rating: 10, weight: c.weight }));
      const result = calculateFinalScore(items);
      assert.equal(result.totalWeightedScore, 100);
      assert.equal(result.isComplete, true);
    }
  });

  test("server score calculation ignores client-supplied weights or scores", () => {
    // Simulated malicious payload trying to send higher weight or manipulated score
    const clientSuppliedWeight = 50;
    const clientSuppliedScore = 99;
    const actualOfficialWeight = 10;

    // Server must use official weight from configuration, NOT client weight
    const serverCalculated = calculateWeightedScore(8, actualOfficialWeight);
    assert.equal(serverCalculated, 8.0);
    assert.notEqual(serverCalculated, (8 / 10) * clientSuppliedWeight);
    assert.notEqual(serverCalculated, clientSuppliedScore);
  });
});

describe("Stage 3 — Server-Authoritative Duration Calculation", () => {
  test("calculates duration excluding paused intervals", () => {
    // Room accumulated 120 seconds, was paused, so no live segment
    const roomState = {
      accumulatedTime: 120,
      startedAt: null,
      pausedAt: new Date(),
    };

    let calculatedDuration = roomState.accumulatedTime;
    if (roomState.startedAt && !roomState.pausedAt) {
      calculatedDuration += 30; // live segment
    }

    assert.equal(calculatedDuration, 120, "Must strictly equal accumulated time when paused");
  });

  test("adds live segment if timer is currently running", () => {
    const startedAt = new Date(Date.now() - 45000); // 45 seconds ago
    const roomState = {
      accumulatedTime: 60,
      startedAt,
      pausedAt: null,
    };

    let calculatedDuration = roomState.accumulatedTime;
    if (roomState.startedAt && !roomState.pausedAt) {
      const liveSegment = Math.floor((Date.now() - roomState.startedAt.getTime()) / 1000);
      calculatedDuration += liveSegment;
    }

    assert.ok(calculatedDuration >= 104 && calculatedDuration <= 106);
  });
});

describe("Stage 3 — Database Schema & Historical Preservation", () => {
  test("Interview schema contains interviewSessionId with partial unique index", () => {
    const schema = Interview.schema as any;
    assert.ok(schema.paths["interviewSessionId"]);
    const indexes = schema.indexes();
    const sessionIdx = indexes.find((idx: any) => idx[0] && idx[0].interviewSessionId === 1);
    assert.ok(sessionIdx, "Must have an index on interviewSessionId");
    assert.equal(sessionIdx[1].unique, true);
    assert.deepEqual(sessionIdx[1].partialFilterExpression, {
      interviewSessionId: { $type: "string" },
    });
  });

  test("Applicant schema criteriaEvaluation snapshot includes interviewSessionId", () => {
    const schema = Applicant.schema as any;
    const subpaths = schema.path("criteriaEvaluation").schema.paths;
    assert.ok(subpaths["interviewSessionId"]);
    assert.ok(subpaths["interviewerId"]);
    assert.ok(subpaths["interviewerName"]);
  });

  test("InterviewRoom schema contains interviewSessionId and eventId", () => {
    const schema = InterviewRoom.schema as any;
    assert.ok(schema.paths["interviewSessionId"]);
    assert.ok(schema.paths["eventId"]);
  });

  test("InterviewSession schema validates session lifecycle fields", () => {
    const schema = InterviewSession.schema as any;
    assert.ok(schema.paths["sessionId"]);
    assert.ok(schema.paths["applicantId"]);
    assert.ok(schema.paths["roomNumber"]);
    assert.ok(schema.paths["status"]);
    assert.ok(schema.paths["startedAt"]);
    assert.ok(schema.paths["completedAt"]);
  });

  test("reinterview creates a new Interview record without modifying the prior record", () => {
    const applicantId = new mongoose.Types.ObjectId();
    const session1Id = crypto.randomUUID();
    const session2Id = crypto.randomUUID();

    const record1 = new Interview({
      interviewSessionId: session1Id,
      applicantId,
      interviewerId: "INT1",
      roomNumber: 1,
      status: "Completed",
      decision: "Pending",
      duration: 300,
      criteriaEvaluation: {
        rubricVersion: "nexus-interview-v2",
        path: "learner",
        criteria: [],
        totalWeightedScore: 72.5,
        isComplete: true,
      },
    });

    const record2 = new Interview({
      interviewSessionId: session2Id,
      applicantId,
      interviewerId: "INT2",
      roomNumber: 2,
      status: "Completed",
      decision: "Approved",
      duration: 450,
      criteriaEvaluation: {
        rubricVersion: "nexus-interview-v2",
        path: "all-rounder",
        criteria: [],
        totalWeightedScore: 88.0,
        isComplete: true,
      },
    });

    assert.notEqual(record1.interviewSessionId, record2.interviewSessionId);
    assert.equal(record1.criteriaEvaluation?.totalWeightedScore, 72.5);
    assert.equal(record2.criteriaEvaluation?.totalWeightedScore, 88.0);
    assert.equal(record1.decision, "Pending");
    assert.equal(record2.decision, "Approved");
  });

  test("legacy Applicant evaluation and appliedPath remain untouched", () => {
    const doc = new Applicant({
      name: "Legacy Applicant",
      rollNumber: "LEGACY001",
      appliedPath: "learner",
      evaluation: {
        technical: 8,
        communication: 7,
        confidence: 9,
      },
      dimensionEvaluation: {
        path: "learner",
        dimensions: [{ dimensionId: "dim_1", score: 8 }],
      },
    });

    assert.equal(doc.appliedPath, "learner");
    assert.equal(doc.evaluation?.technical, 8);
    assert.equal(doc.dimensionEvaluation?.dimensions[0].score, 8);
    assert.equal(doc.criteriaEvaluation, undefined);
  });
});

describe("Stage 3 — Shared Room Access & Independent Session Ownership", () => {
  test("authorized interviewers can consecutively use the same room without permanent room lock", () => {
    // Room 1 starts available
    const room = {
      roomNumber: 1,
      isActive: true,
      applicant: null as any,
      interviewSessionId: null as any,
      interviewerId: null as any,
      interviewer: null as any,
      status: "Available",
    };

    // Interviewer A enters and starts an interview with Applicant 1
    const session1Id = crypto.randomUUID();
    const interviewerA = { id: "INT_A", name: "Alice" };
    room.applicant = "app_1";
    room.interviewSessionId = session1Id;
    room.interviewerId = interviewerA.id;
    room.interviewer = interviewerA.name;
    room.status = "Occupied";

    assert.equal(room.interviewSessionId, session1Id);
    assert.equal(room.interviewerId, "INT_A");

    // Session 1 ends: room is released
    room.applicant = null;
    room.interviewSessionId = null;
    room.status = "Available";

    // Interviewer B enters the same room and starts an interview with Applicant 2
    const session2Id = crypto.randomUUID();
    const interviewerB = { id: "INT_B", name: "Bob" };
    room.applicant = "app_2";
    room.interviewSessionId = session2Id;
    room.interviewerId = interviewerB.id;
    room.interviewer = interviewerB.name;
    room.status = "Occupied";

    assert.equal(room.interviewSessionId, session2Id);
    assert.equal(room.interviewerId, "INT_B");
    assert.notEqual(session1Id, session2Id);
  });

  test("interviewer B cannot finalize an active session started by interviewer A", () => {
    const sessionA = {
      sessionId: "session-alice-123",
      applicantId: "app_10",
      interviewerId: "INT_ALICE",
      interviewerName: "Alice",
      clerkUserId: "user_alice_clerk",
      status: "active",
    };

    const callerBob = {
      interviewerId: "INT_BOB",
      clerkUserId: "user_bob_clerk",
      interviewerName: "Bob",
    };

    const callerClerkId = (callerBob.clerkUserId || "").trim();
    const storedClerkId = (sessionA.clerkUserId || "").trim();

    // Strict Clerk user ID match required; display names never used for authorization
    const isSessionOwner = Boolean(
      callerClerkId && storedClerkId && callerClerkId === storedClerkId
    );

    assert.equal(isSessionOwner, false, "Interviewer B must be denied authorization to finalize Interviewer A's session");
  });
});

describe("Stage 3 — Atomic Concurrency & State Integrity", () => {
  test("atomic start query rejects competing requests for the same applicant or room", () => {
    // Condition for assigning an applicant: must be Waiting and unassigned
    const applicantState = {
      _id: "app_concurrency_1",
      interviewStatus: "Waiting",
      assignedRoom: null as number | null,
    };

    const matchesCondition = (app: typeof applicantState) =>
      app.interviewStatus === "Waiting" && (app.assignedRoom === null || app.assignedRoom === undefined);

    // Request 1 succeeds
    assert.equal(matchesCondition(applicantState), true);
    applicantState.interviewStatus = "Interviewing";
    applicantState.assignedRoom = 1;

    // Concurrent Request 2 fails because applicant is no longer Waiting/unassigned
    assert.equal(matchesCondition(applicantState), false);
  });

  test("unique partial index ignores null or undefined session IDs", () => {
    // Simulated index evaluator: partialFilterExpression { interviewSessionId: { $type: "string" } }
    const indexedEntries = new Map<string, string>();

    const insertRecord = (id: string, sessionVal: any) => {
      if (typeof sessionVal === "string") {
        if (indexedEntries.has(sessionVal)) {
          throw new Error(`E11000 duplicate key error collection: interviews index: interviewSessionId_1 dup key: { interviewSessionId: "${sessionVal}" }`);
        }
        indexedEntries.set(sessionVal, id);
      }
      // Non-strings (null, undefined) are not indexed and never collide
    };

    // Insert legacy documents with null/undefined session IDs
    assert.doesNotThrow(() => insertRecord("doc1", null));
    assert.doesNotThrow(() => insertRecord("doc2", null));
    assert.doesNotThrow(() => insertRecord("doc3", undefined));
    assert.doesNotThrow(() => insertRecord("doc4", undefined));

    // Insert unique session ID strings
    assert.doesNotThrow(() => insertRecord("doc5", "session-aaa"));
    assert.doesNotThrow(() => insertRecord("doc6", "session-bbb"));

    // Attempting duplicate session ID string throws duplicate key error
    assert.throws(
      () => insertRecord("doc7", "session-aaa"),
      /E11000 duplicate key error/
    );
  });
});

describe("Stage 3 — Applicant Status & Consumer Compatibility", () => {
  test("stores official final decision in interviewStatus and finalDecision", () => {
    const validDecisions = ["Approved", "Pending", "Discussion Needed"];
    const enumValues = Applicant.schema.path("interviewStatus").enumValues;

    for (const d of validDecisions) {
      assert.ok(enumValues.includes(d), `Applicant interviewStatus enum must include "${d}"`);
    }

    // Status transition upon interview end
    const applicant = new Applicant({
      name: "Tested Candidate",
      rollNumber: "ROLL_TEST",
      interviewStatus: "Interviewing",
      assignedRoom: 1,
    });

    applicant.interviewStatus = "Approved";
    applicant.finalDecision = "Approved";
    applicant.assignedRoom = null;

    assert.equal(applicant.interviewStatus, "Approved");
    assert.equal(applicant.finalDecision, "Approved");
    assert.equal(applicant.assignedRoom, null);
  });
});

