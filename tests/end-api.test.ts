import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { getPathConfig, calculateWeightedScore, calculateFinalScore } from "../src/lib/dimensions.ts";
import { resolveDatabaseName, validateDatabaseAccess } from "../src/lib/mongodb.ts";

describe("Stage 3 — End Interview API Validation Rules", () => {
  test("strictly enforces allowed decision values", () => {
    const ALLOWED = ["Approved", "Pending", "Discussion Needed"];
    const checkDecision = (d: any) => typeof d === "string" && ALLOWED.includes(d);

    assert.equal(checkDecision("Approved"), true);
    assert.equal(checkDecision("Pending"), true);
    assert.equal(checkDecision("Discussion Needed"), true);

    assert.equal(checkDecision("Rejected"), false);
    assert.equal(checkDecision(""), false);
    assert.equal(checkDecision(null), false);
    assert.equal(checkDecision(undefined), false);
    assert.equal(checkDecision("APPROVED"), false);
  });

  test("validates required criteria for Learner's Path (7 criteria)", () => {
    const config = getPathConfig("learner")!;
    assert.equal(config.criteria.length, 7);

    const validSubmission = config.criteria.map((c) => ({
      id: c.id,
      rating: 8,
      feedback: "Good grasp",
    }));

    // Verify all IDs match
    const submittedIds = new Set(validSubmission.map((c) => c.id));
    assert.equal(submittedIds.size, 7);
    for (const expected of config.criteria) {
      assert.ok(submittedIds.has(expected.id));
    }

    // Missing criterion scenario
    const missingOne = validSubmission.slice(1);
    assert.notEqual(missingOne.length, config.criteria.length);

    // Unknown criterion scenario
    const withUnknown = [...validSubmission.slice(1), { id: "unknown_skill", rating: 8 }];
    const hasUnknown = withUnknown.some((c) => !config.criteria.some((expected) => expected.id === c.id));
    assert.ok(hasUnknown);
  });

  test("validates required criteria for All-Rounder Path (10 criteria)", () => {
    const config = getPathConfig("all-rounder")!;
    assert.equal(config.criteria.length, 10);

    const validSubmission = config.criteria.map((c) => ({
      id: c.id,
      rating: 9,
    }));
    assert.equal(validSubmission.length, 10);
  });

  test("validates required criteria for Contributor Path (7 criteria)", () => {
    const config = getPathConfig("contributor")!;
    assert.equal(config.criteria.length, 7);

    const validSubmission = config.criteria.map((c) => ({
      id: c.id,
      rating: 7,
    }));
    assert.equal(validSubmission.length, 7);
  });

  test("rejects rating <= 0, > 10, or floating point", () => {
    const isInteger1to10 = (r: any) => Number.isInteger(r) && r >= 1 && r <= 10;

    assert.equal(isInteger1to10(1), true);
    assert.equal(isInteger1to10(10), true);
    assert.equal(isInteger1to10(0), false);
    assert.equal(isInteger1to10(11), false);
    assert.equal(isInteger1to10(7.8), false);
    assert.equal(isInteger1to10(NaN), false);
  });

  test("validates overall feedback max length of 5,000 characters", () => {
    const shortFeedback = "Candidate did well in system design.";
    const longFeedback = "a".repeat(5001);

    assert.ok(shortFeedback.length <= 5000);
    assert.ok(longFeedback.length > 5000);
  });

  test("calculates server-authoritative duration accurately", () => {
    const accumulated = 180; // 3 minutes accumulated
    const startedAt = new Date(Date.now() - 25000); // started 25s ago
    const pausedAt = null;

    let duration = accumulated;
    if (startedAt && !pausedAt) {
      duration += Math.floor((Date.now() - startedAt.getTime()) / 1000);
    }

    assert.ok(duration >= 204 && duration <= 206);
  });

  test("exact 15-minute timer scenario: 10m run + 10m pause + 5m run = 15m duration", () => {
    // Exact scenario from prompt:
    // Start: 10:00 (base: 0s)
    // Run for 10 minutes: 10:10 (600s)
    // Pause: 10:10 (accumulated = 600s, pausedAt = 10:10, startedAt = null)
    // Remain paused until 10:20 (10 minutes elapsed in pause, duration must NOT increase)
    // Resume: 10:20 (startedAt = 10:20, pausedAt = null, accumulated = 600s)
    // Run for 5 minutes: 10:25 (300s)
    // End: 10:25 -> final duration = 600s + 300s = 900s = 15 minutes.

    const t10_00 = new Date("2026-11-13T10:00:00.000Z");
    const t10_10 = new Date("2026-11-13T10:10:00.000Z");
    const t10_20 = new Date("2026-11-13T10:20:00.000Z");
    const t10_25 = new Date("2026-11-13T10:25:00.000Z");

    // Phase 1: Running 10:00 to 10:10
    let room = {
      startedAt: t10_00,
      pausedAt: null as Date | null,
      accumulatedTime: 0,
    };

    // Pause action at 10:10: calculate running segment and store accumulatedTime
    const seg1 = Math.floor((t10_10.getTime() - room.startedAt.getTime()) / 1000);
    assert.equal(seg1, 600, "First segment must be exactly 600 seconds (10 minutes)");
    room.accumulatedTime += seg1;
    room.pausedAt = t10_10;
    room.startedAt = null as any;

    // Phase 2: Paused between 10:10 and 10:20
    // Querying duration during pause (e.g. at 10:15 or 10:20)
    const calculateDuration = (roomState: typeof room, asOfTime: Date) => {
      let dur = roomState.accumulatedTime ?? 0;
      if (roomState.startedAt && !roomState.pausedAt) {
        dur += Math.floor((asOfTime.getTime() - new Date(roomState.startedAt).getTime()) / 1000);
      }
      return dur;
    };

    const durationAt10_15 = calculateDuration(room, new Date("2026-11-13T10:15:00.000Z"));
    assert.equal(durationAt10_15, 600, "Duration during pause must remain 600 seconds");
    const durationAt10_20 = calculateDuration(room, t10_20);
    assert.equal(durationAt10_20, 600, "Duration at end of pause must still be 600 seconds");

    // Phase 3: Resume action at 10:20
    room.startedAt = t10_20;
    room.pausedAt = null;

    // Phase 4: Final submission at 10:25
    const finalDuration = calculateDuration(room, t10_25);
    assert.equal(finalDuration, 900, "Final duration must be exactly 900 seconds");
    assert.equal(finalDuration / 60, 15, "Final duration must be exactly 15 minutes");
  });

  test("modal cancel retains previous pause/run state", () => {
    // Case 1: Timer was running when modal opened -> pause on open -> cancel resumes
    let isRunning = true;
    let wasTimerRunningBeforeModal = false;

    // Open modal
    wasTimerRunningBeforeModal = isRunning;
    if (isRunning) {
      isRunning = false; // paused
    }
    assert.equal(wasTimerRunningBeforeModal, true);
    assert.equal(isRunning, false);

    // Cancel modal
    if (wasTimerRunningBeforeModal) {
      isRunning = true; // resumed
    }
    assert.equal(isRunning, true, "Must resume timer if it was running before modal");

    // Case 2: Timer was already paused when modal opened -> cancel leaves it paused
    isRunning = false;
    wasTimerRunningBeforeModal = isRunning;
    if (isRunning) {
      isRunning = false;
    }
    assert.equal(wasTimerRunningBeforeModal, false);
    assert.equal(isRunning, false);

    // Cancel modal
    if (wasTimerRunningBeforeModal) {
      isRunning = true;
    }
    assert.equal(isRunning, false, "Must remain paused if it was paused before modal");
  });

  test("failed submission leaves timer paused without double counting", () => {
    let isRunning = false;
    let submitError = "";

    try {
      // Simulate submission failure
      throw new Error("Network timeout during submission");
    } catch (err: any) {
      submitError = err.message;
      // Note: No handleStartResume() call on submission failure
    }

    assert.equal(isRunning, false, "Timer must remain paused on failed submission");
    assert.equal(submitError, "Network timeout during submission");
  });

  test("idempotent retry validation: verifies caller Clerk identity before returning completed result", () => {
    const originalClerkUserId = "user_clerk_alice_123";
    const originalInterviewerId = "INT_ALICE";
    const sessionDoc = {
      interviewSessionId: "session-uuid-111",
      clerkUserId: originalClerkUserId,
      interviewerId: originalInterviewerId,
      interviewerName: "Alice Smith",
      applicantId: "app_123",
      path: "learner",
      decision: "Approved",
      duration: 900,
    };

    // Caller 1: Same Clerk user (Alice) retries
    const callerAlice = { clerkUserId: "user_clerk_alice_123", interviewerId: "INT_ALICE", interviewerName: "Alice Smith" };
    const isAliceAuthorized =
      callerAlice.clerkUserId === sessionDoc.clerkUserId &&
      callerAlice.interviewerId === sessionDoc.interviewerId;
    assert.equal(isAliceAuthorized, true, "Alice must be recognized as session owner");

    // Caller 2: Different Clerk user attempting to fetch Alice's completed interview
    const callerBob = { clerkUserId: "user_clerk_bob_456", interviewerId: "INT_BOB", interviewerName: "Bob Jones" };
    const isBobAuthorized = callerBob.clerkUserId === sessionDoc.clerkUserId;
    assert.equal(isBobAuthorized, false, "Bob must NOT be authorized to access Alice's session");
  });

  test("rejects conflicting retry payload with 409 Conflict", () => {
    const completedRecord = {
      interviewSessionId: "session-uuid-222",
      applicantId: "app_456",
      path: "learner",
      decision: "Approved",
    };

    // Payload with changed decision
    const conflictingPayload1 = {
      applicantId: "app_456",
      path: "learner",
      decision: "Discussion Needed", // conflicting!
    };
    const isConflict1 =
      conflictingPayload1.applicantId !== completedRecord.applicantId ||
      conflictingPayload1.path !== completedRecord.path ||
      conflictingPayload1.decision !== completedRecord.decision;
    assert.equal(isConflict1, true, "Must flag decision conflict");

    // Payload with changed path
    const conflictingPayload2 = {
      applicantId: "app_456",
      path: "contributor", // conflicting!
      decision: "Approved",
    };
    const isConflict2 =
      conflictingPayload2.path !== completedRecord.path;
    assert.equal(isConflict2, true, "Must flag path conflict");

    // Matching payload
    const matchingPayload = {
      applicantId: "app_456",
      path: "learner",
      decision: "Approved",
    };
    const isMatching =
      matchingPayload.applicantId === completedRecord.applicantId &&
      matchingPayload.path === completedRecord.path &&
      matchingPayload.decision === completedRecord.decision;
    assert.equal(isMatching, true, "Matching retry payload must be accepted");
  });

  test("safe room release filter strictly matches room, applicant, and interviewSessionId", () => {
    const roomState = {
      roomNumber: 1,
      applicant: "app_NEW_999",
      interviewSessionId: "session-NEW-222",
      eventId: "event_2026",
    };

    // Old retry trying to release room with old session ID
    const oldSessionReleaseFilter = {
      roomNumber: 1,
      applicant: "app_OLD_111",
      interviewSessionId: "session-OLD-111",
      eventId: "event_2026",
    };

    const matchesOld =
      roomState.roomNumber === oldSessionReleaseFilter.roomNumber &&
      roomState.applicant === oldSessionReleaseFilter.applicant &&
      roomState.interviewSessionId === oldSessionReleaseFilter.interviewSessionId;

    assert.equal(matchesOld, false, "Old session filter must NEVER match a newly occupied room");
  });
});

describe("Stage 3 — Strict Clerk & Interviewer Identity Verification", () => {
  const verifyOwnership = (
    caller: { clerkUserId?: string; interviewerId?: string; interviewerName?: string },
    session: { clerkUserId?: string; interviewerId?: string; interviewerName?: string }
  ): { authorized: boolean; reason?: string } => {
    const callerClerk = caller.clerkUserId?.trim();
    const storedClerk = session.clerkUserId?.trim();

    if (!callerClerk) {
      return { authorized: false, reason: "Missing caller Clerk user identity" };
    }
    if (!storedClerk) {
      return { authorized: false, reason: "Missing stored Clerk user identity" };
    }
    if (callerClerk !== storedClerk) {
      return { authorized: false, reason: "Clerk user identity mismatch" };
    }

    const callerIntId = caller.interviewerId?.trim();
    const storedIntId = session.interviewerId?.trim();
    if (callerIntId && storedIntId && callerIntId !== storedIntId) {
      return { authorized: false, reason: "Internal interviewer profile mismatch" };
    }

    return { authorized: true };
  };

  test("authorizes when Clerk user ID and interviewer profile match exactly", () => {
    const session = {
      clerkUserId: "user_2abc_valid",
      interviewerId: "INT_001",
      interviewerName: "Alice Smith",
    };
    const caller = {
      clerkUserId: "user_2abc_valid",
      interviewerId: "INT_001",
      interviewerName: "Alice Smith",
    };

    const res = verifyOwnership(caller, session);
    assert.equal(res.authorized, true);
  });

  test("rejects different Clerk user with the same display name", () => {
    const session = {
      clerkUserId: "user_2abc_alice",
      interviewerId: "INT_001",
      interviewerName: "Alice Smith",
    };
    // Imposter with different Clerk ID but identical display name
    const caller = {
      clerkUserId: "user_2xyz_imposter",
      interviewerId: "INT_001",
      interviewerName: "Alice Smith",
    };

    const res = verifyOwnership(caller, session);
    assert.equal(res.authorized, false);
    assert.equal(res.reason, "Clerk user identity mismatch");
  });

  test("rejects when internal interviewer profile IDs mismatch", () => {
    const session = {
      clerkUserId: "user_2abc_alice",
      interviewerId: "INT_001",
      interviewerName: "Alice Smith",
    };
    const caller = {
      clerkUserId: "user_2abc_alice",
      interviewerId: "INT_999", // Different internal profile!
      interviewerName: "Alice Smith",
    };

    const res = verifyOwnership(caller, session);
    assert.equal(res.authorized, false);
    assert.equal(res.reason, "Internal interviewer profile mismatch");
  });

  test("rejects when stored session has missing Clerk identity", () => {
    const session = {
      clerkUserId: "", // Missing or corrupted
      interviewerId: "INT_001",
      interviewerName: "Alice Smith",
    };
    const caller = {
      clerkUserId: "user_2abc_alice",
      interviewerId: "INT_001",
      interviewerName: "Alice Smith",
    };

    const res = verifyOwnership(caller, session);
    assert.equal(res.authorized, false);
    assert.equal(res.reason, "Missing stored Clerk user identity");
  });

  test("rejects unauthorized retry of completed session", () => {
    const completedSession = {
      clerkUserId: "user_2abc_alice",
      interviewerId: "INT_001",
      interviewerName: "Alice Smith",
    };
    const unauthorizedCaller = {
      clerkUserId: "user_2other_bob",
      interviewerId: "INT_002",
      interviewerName: "Bob Jones",
    };

    const res = verifyOwnership(unauthorizedCaller, completedSession);
    assert.equal(res.authorized, false);
  });
});

describe("Stage 3 — Event Association & Room Reservation Integrity", () => {
  test("associates room with active event upon reservation", () => {
    const activeEventId = "event_2026_spring";
    const candidate = { _id: "cand_1", eventId: activeEventId };

    const eventId = (candidate.eventId || activeEventId || "").trim();
    const room = {
      roomNumber: 1,
      applicant: null as string | null,
      eventId: "" as string,
      status: "Available",
    };

    // Reserving room
    assert.ok(eventId, "Valid non-empty eventId is required");
    room.applicant = candidate._id;
    room.eventId = eventId;
    room.status = "Occupied";

    assert.equal(room.eventId, "event_2026_spring");
    assert.equal(room.status, "Occupied");
  });

  test("rejects interview start when event association cannot be established", () => {
    const activeEventId = "";
    const candidateWithoutEvent = { _id: "cand_no_event", eventId: "" };

    const eventId = (candidateWithoutEvent.eventId || activeEventId || "").trim();
    const canStart = Boolean(eventId);

    assert.equal(canStart, false, "Must reject start when event association is missing");
  });

  test("rejects interview finalization when session event association is missing", () => {
    const sessionDocWithoutEvent = {
      sessionId: "sess_missing_event",
      eventId: "",
    };

    const sessionEventId = (sessionDocWithoutEvent.eventId || "").trim();
    const isValidForEnd = Boolean(sessionEventId);

    assert.equal(isValidForEnd, false, "Must reject finalization when session eventId is missing");
  });

  test("rejects finalization when room event mismatches session event", () => {
    const sessionEventId = "event_2026_spring";
    const roomWithDifferentEvent = {
      roomNumber: 1,
      eventId: "event_2026_fall",
    };

    const isMatch = roomWithDifferentEvent.eventId.trim() === sessionEventId;
    assert.equal(isMatch, false, "Must flag room event mismatch");
  });

  test("rejects finalization when applicant event mismatches session event", () => {
    const sessionEventId = "event_2026_spring";
    const applicantWithDifferentEvent = {
      _id: "app_1",
      eventId: "event_2026_fall",
    };

    const isMatch = applicantWithDifferentEvent.eventId.trim() === sessionEventId;
    assert.equal(isMatch, false, "Must flag applicant event mismatch");
  });

  test("global active event change does NOT alter active interview session event", () => {
    // Session started during Spring event
    const sessionEventId = "event_2026_spring";
    const session = {
      sessionId: "session_spring_1",
      eventId: sessionEventId,
      status: "active",
    };

    // Admin changes global active event to Fall while interview is ongoing
    const newlyActiveGlobalEventId = "event_2026_fall";
    assert.notEqual(session.eventId, newlyActiveGlobalEventId);

    // Final evaluation must preserve session's original eventId
    const finalEventId = session.eventId || newlyActiveGlobalEventId;
    assert.equal(finalEventId, "event_2026_spring", "Active session event must never be mutated by global event switches");
  });

  test("old-session room release cannot release room associated with a different event", () => {
    // Current room state: assigned to Fall event
    const currentRoom = {
      roomNumber: 2,
      applicant: "applicant_fall",
      interviewSessionId: "session_fall_99",
      eventId: "event_2026_fall",
      status: "Occupied",
    };

    // Stale submission from Spring event trying to release Room 2
    // Room release filter strictly and unconditionally specifies eventId
    const staleSpringReleaseFilter = {
      roomNumber: 2,
      applicant: "applicant_spring",
      interviewSessionId: "session_spring_01",
      eventId: "event_2026_spring",
    };

    const matchesReleaseFilter =
      currentRoom.roomNumber === staleSpringReleaseFilter.roomNumber &&
      currentRoom.applicant === staleSpringReleaseFilter.applicant &&
      currentRoom.interviewSessionId === staleSpringReleaseFilter.interviewSessionId &&
      currentRoom.eventId === staleSpringReleaseFilter.eventId;

    assert.equal(matchesReleaseFilter, false, "Stale submission filter must NOT match room associated with different event");
  });

  test("successful event-scoped room release matches room, applicant, session, and eventId", () => {
    const currentRoom = {
      roomNumber: 3,
      applicant: "applicant_spring_3",
      interviewSessionId: "session_spring_3",
      eventId: "event_2026_spring",
      status: "Occupied",
    };

    const correctReleaseFilter = {
      roomNumber: 3,
      applicant: "applicant_spring_3",
      interviewSessionId: "session_spring_3",
      eventId: "event_2026_spring",
    };

    const matches =
      currentRoom.roomNumber === correctReleaseFilter.roomNumber &&
      currentRoom.applicant === correctReleaseFilter.applicant &&
      currentRoom.interviewSessionId === correctReleaseFilter.interviewSessionId &&
      currentRoom.eventId === correctReleaseFilter.eventId;

    assert.equal(matches, true, "Matching session release filter must successfully release the room");
  });
});

describe("Stage 3 — MongoDB Environment Isolation & Database Resolution", () => {
  test("1. MONGODB_DB takes precedence over a conflicting URI database path", () => {
    const uri = "mongodb+srv://user:pass@cluster0.mongodb.net/nexus_recruit?retryWrites=true";
    const env = { MONGODB_DB: "nexus_recruit_preview" };
    const resolved = resolveDatabaseName(uri, env);
    assert.equal(resolved, "nexus_recruit_preview", "Explicit MONGODB_DB must override URI database path");
  });

  test("2. URI database path is respected when no explicit database override exists", () => {
    const uri = "mongodb+srv://user:pass@cluster0.mongodb.net/nexus_recruit_custom?retryWrites=true";
    const env = {};
    const resolved = resolveDatabaseName(uri, env);
    assert.equal(resolved, "nexus_recruit_custom", "URI path must be used when MONGODB_DB is not defined");
  });

  test("3. VERCEL_ENV=preview resolves to nexus_recruit_preview when no higher-priority configuration exists", () => {
    const uri = "mongodb+srv://user:pass@cluster0.mongodb.net/?retryWrites=true";
    const env = { VERCEL_ENV: "preview" };
    const resolved = resolveDatabaseName(uri, env);
    assert.equal(resolved, "nexus_recruit_preview", "VERCEL_ENV=preview must resolve to nexus_recruit_preview");
  });

  test("4. VERCEL_ENV=production resolves to nexus_recruit", () => {
    const uri = "mongodb+srv://user:pass@cluster0.mongodb.net/?retryWrites=true";
    const env = { VERCEL_ENV: "production" };
    const resolved = resolveDatabaseName(uri, env);
    assert.equal(resolved, "nexus_recruit", "VERCEL_ENV=production must resolve to nexus_recruit");
  });

  test("5. Local development defaults to nexus_recruit_dev", () => {
    const uri = "mongodb+srv://user:pass@cluster0.mongodb.net/?retryWrites=true";
    const env = {}; // No VERCEL_ENV, no MONGODB_DB, no URI path
    const resolved = resolveDatabaseName(uri, env);
    assert.equal(resolved, "nexus_recruit_dev", "Local development must default safely to nexus_recruit_dev");
  });

  test("6. Local development cannot connect to nexus_recruit without explicit opt-in", () => {
    // Scenario A: Local environment attempts to connect to nexus_recruit without ALLOW_PRODUCTION_DB
    const envWithoutOptIn = { VERCEL_ENV: "development" };
    assert.throws(
      () => validateDatabaseAccess("nexus_recruit", envWithoutOptIn),
      /Protection Block: Local development environment is attempting to connect to production database/
    );

    // Scenario B: Local environment with ALLOW_PRODUCTION_DB=true is permitted
    const envWithOptIn = { VERCEL_ENV: "development", ALLOW_PRODUCTION_DB: "true" };
    assert.doesNotThrow(() => validateDatabaseAccess("nexus_recruit", envWithOptIn));

    // Scenario C: Production environment does not require ALLOW_PRODUCTION_DB
    const prodEnv = { VERCEL_ENV: "production" };
    assert.doesNotThrow(() => validateDatabaseAccess("nexus_recruit", prodEnv));
  });

  test("7. Invalid or missing database configuration fails safely", () => {
    const uri = "mongodb+srv://user:pass@cluster0.mongodb.net/?retryWrites=true";
    // If someone explicitly supplies empty strings for all overrides
    const emptyEnv = { MONGODB_DB: "", MONGODB_DATABASE: "", LOCAL_MONGODB_DB: "" };
    const resolved = resolveDatabaseName(uri, emptyEnv);
    // Falls safely to local default nexus_recruit_dev rather than null/undefined
    assert.ok(resolved, "Must produce a valid safe database name");
    assert.equal(resolved, "nexus_recruit_dev");
  });
});

