import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import InterviewRoom from "@/models/InterviewRoom";
import InterviewSession from "@/models/InterviewSession";
import Applicant from "@/models/Applicant";
import Interview from "@/models/Interview";
import { getAuthSession } from "@/lib/auth";
import { getPathConfig, calculateWeightedScore, RUBRIC_VERSION } from "@/lib/dimensions";

const ALLOWED_DECISIONS = ["Approved", "Pending", "Discussion Needed"] as const;
type Decision = (typeof ALLOWED_DECISIONS)[number];

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (session.role === "unauthorized") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please sign in." },
        { status: 401 }
      );
    }
    if (session.role !== "interviewer") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Interviewer access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      interviewSessionId,
      applicantId,
      path,
      criteria,
      overallFeedback,
      decision,
      notes,
    } = body as {
      interviewSessionId?: string;
      applicantId?: string;
      path?: string;
      criteria?: Array<{
        id: string;
        rating: number;
        feedback?: string;
      }>;
      overallFeedback?: string;
      decision?: string;
      notes?: string;
    };

    // 1. Basic field presence validation
    if (!interviewSessionId || typeof interviewSessionId !== "string" || !interviewSessionId.trim()) {
      return NextResponse.json(
        { success: false, error: "interviewSessionId is required." },
        { status: 400 }
      );
    }

    if (!applicantId || typeof applicantId !== "string" || !applicantId.trim()) {
      return NextResponse.json(
        { success: false, error: "applicantId is required." },
        { status: 400 }
      );
    }

    if (!path || typeof path !== "string") {
      return NextResponse.json(
        { success: false, error: "Evaluation path is required." },
        { status: 400 }
      );
    }

    if (!decision || !ALLOWED_DECISIONS.includes(decision as Decision)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid decision "${decision}". Must be one of: ${ALLOWED_DECISIONS.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(criteria)) {
      return NextResponse.json(
        { success: false, error: "Criteria evaluation items array is required." },
        { status: 400 }
      );
    }

    if (overallFeedback && typeof overallFeedback === "string" && overallFeedback.length > 5000) {
      return NextResponse.json(
        { success: false, error: "Overall feedback exceeds 5,000 characters limit." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const callerClerkUserId = (session.clerkUserId || "").trim();
    const callerInterviewerId = (session.interviewerId || "").trim();

    if (!callerClerkUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Missing authenticated Clerk user identity.",
        },
        { status: 403 }
      );
    }

    // Look up durable session record early for identity and event association
    const sessionDoc = await InterviewSession.findOne({ sessionId: interviewSessionId.trim() });

    // 2. Check for idempotent retry of an already completed interview
    const existingCompleted = await Interview.findOne({ interviewSessionId: interviewSessionId.trim() });
    if (existingCompleted) {
      // Validate authenticated ownership of the completed interview:
      // A. Check against Interview document's stored clerkUserId or sessionDoc stored clerkUserId
      const completedClerkUserId = String((existingCompleted as any).clerkUserId || "").trim();
      const sessionStoredClerkUserId = String(sessionDoc?.clerkUserId || "").trim();

      const clerkUserIdToMatch = completedClerkUserId || sessionStoredClerkUserId;
      if (!clerkUserIdToMatch || clerkUserIdToMatch !== callerClerkUserId) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden: You are not authorized to access or finalize another interviewer's completed session.",
          },
          { status: 403 }
        );
      }

      // B. Validate internal interviewer profile association when available on both
      const completedInterviewerId = String(existingCompleted.interviewerId || "").trim();
      const sessionStoredInterviewerId = String(sessionDoc?.interviewerId || "").trim();
      const internalIdToMatch = completedInterviewerId || sessionStoredInterviewerId;

      if (callerInterviewerId && internalIdToMatch && callerInterviewerId !== internalIdToMatch) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden: Internal interviewer profile mismatch on completed session retry.",
          },
          { status: 403 }
        );
      }

      // Check for payload conflicts on retry
      if (
        String(existingCompleted.applicantId) !== applicantId.trim() ||
        (existingCompleted.path && existingCompleted.path !== path) ||
        (existingCompleted.decision && existingCompleted.decision !== decision)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Conflict: Submitted retry payload does not match the original completed interview record.",
          },
          { status: 409 }
        );
      }

      // Safe idempotent return without touching room or database
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        interviewId: existingCompleted._id,
        totalWeightedScore: existingCompleted.criteriaEvaluation?.totalWeightedScore ?? 0,
        duration: existingCompleted.duration ?? 0,
      });
    }

    // 3. Validate Session Ownership & State for Active Submission
    if (!sessionDoc) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Interview session record not found. Identity cannot be verified.",
        },
        { status: 403 }
      );
    }

    if (sessionDoc.status === "completed") {
      return NextResponse.json(
        { success: false, error: "Conflict: This interview session is already marked completed." },
        { status: 409 }
      );
    }

    // Exact Clerk User ID match (Strictly required; display names never used)
    const storedClerkUserId = (sessionDoc.clerkUserId || "").trim();
    if (!storedClerkUserId || storedClerkUserId !== callerClerkUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: You are not authorized to finalize this interview session. Clerk user identity mismatch.",
        },
        { status: 403 }
      );
    }

    // Validate internal interviewer profile association when available on both
    const storedInterviewerId = (sessionDoc.interviewerId || "").trim();
    if (callerInterviewerId && storedInterviewerId && callerInterviewerId !== storedInterviewerId) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: You are not authorized to finalize this interview session. Interviewer profile mismatch.",
        },
        { status: 403 }
      );
    }

    if (String(sessionDoc.applicantId) !== applicantId.trim()) {
      return NextResponse.json(
        { success: false, error: "Session applicant mismatch." },
        { status: 409 }
      );
    }

    // 4. Validate Room Association & Event Association
    const sessionEventId = (sessionDoc.eventId || "").trim();
    if (!sessionEventId) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Persisted interview session is missing a valid recruitment event association.",
        },
        { status: 400 }
      );
    }

    const room = await InterviewRoom.findOne({
      roomNumber: sessionDoc.roomNumber,
      applicant: applicantId.trim(),
      status: "Occupied",
    });

    if (!room) {
      return NextResponse.json(
        {
          success: false,
          error: "No active occupied room found for this applicant and session. The room may have already been released.",
        },
        { status: 404 }
      );
    }

    // Event association validation: room must match session event
    if (room.eventId && room.eventId.trim() !== sessionEventId) {
      return NextResponse.json(
        {
          success: false,
          error: "Event mismatch: This room is currently assigned to a different recruitment event.",
        },
        { status: 409 }
      );
    }

    // Verify room's active session ID
    if (room.interviewSessionId && room.interviewSessionId !== interviewSessionId.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Session mismatch: This room is currently assigned to a different interview session.",
        },
        { status: 409 }
      );
    }

    // 5. Look up Applicant
    const applicant = await Applicant.findById(applicantId.trim());
    if (!applicant) {
      return NextResponse.json(
        { success: false, error: "Applicant not found." },
        { status: 404 }
      );
    }

    // Verify applicant event association matches session event
    if (applicant.eventId && applicant.eventId.trim() && applicant.eventId.trim() !== sessionEventId) {
      return NextResponse.json(
        {
          success: false,
          error: "Event mismatch: Applicant does not belong to the interview session's recruitment event.",
        },
        { status: 409 }
      );
    }

    // 6. Official Rubric Validation (Source of truth: src/lib/dimensions.ts)
    const pathConfig = getPathConfig(path);
    if (!pathConfig) {
      return NextResponse.json(
        { success: false, error: `Invalid evaluation path: "${path}".` },
        { status: 400 }
      );
    }

    const expectedCriteria = pathConfig.criteria;
    if (criteria.length !== expectedCriteria.length) {
      return NextResponse.json(
        {
          success: false,
          error: `Path "${pathConfig.name}" requires exactly ${expectedCriteria.length} criteria, but received ${criteria.length}.`,
        },
        { status: 400 }
      );
    }

    const submittedMap = new Map<string, { rating: number; feedback?: string }>();
    for (const item of criteria) {
      if (!item.id || typeof item.id !== "string") {
        return NextResponse.json(
          { success: false, error: "Criterion item missing valid id." },
          { status: 400 }
        );
      }
      if (submittedMap.has(item.id)) {
        return NextResponse.json(
          { success: false, error: `Duplicate criterion ID submitted: "${item.id}".` },
          { status: 400 }
        );
      }
      if (!Number.isInteger(item.rating) || item.rating < 1 || item.rating > 10) {
        return NextResponse.json(
          {
            success: false,
            error: `Criterion "${item.id}" must have an explicit integer rating between 1 and 10.`,
          },
          { status: 400 }
        );
      }
      if (item.feedback && typeof item.feedback === "string" && item.feedback.length > 5000) {
        return NextResponse.json(
          {
            success: false,
            error: `Feedback for criterion "${item.id}" exceeds 5,000 characters limit.`,
          },
          { status: 400 }
        );
      }
      submittedMap.set(item.id, item);
    }

    // Build official criterion snapshots & recalculate server-authoritative scores
    const criterionSnapshots = [];
    let totalWeightedScore = 0;

    for (const expected of expectedCriteria) {
      const submitted = submittedMap.get(expected.id);
      if (!submitted) {
        return NextResponse.json(
          {
            success: false,
            error: `Missing required criterion "${expected.name}" (${expected.id}) for path "${pathConfig.name}".`,
          },
          { status: 400 }
        );
      }

      const weightedScore = calculateWeightedScore(submitted.rating, expected.weight);
      totalWeightedScore += weightedScore;

      criterionSnapshots.push({
        id: expected.id,
        dimensionId: expected.id,
        name: expected.name,
        description: expected.description,
        weight: expected.weight,
        rating: submitted.rating,
        score: submitted.rating,
        weightedScore,
        feedback: typeof submitted.feedback === "string" ? submitted.feedback.trim() : "",
        reviewed: true,
      });
    }

    totalWeightedScore = Math.round(totalWeightedScore * 100) / 100;

    // 7. Server-authoritative duration calculation from persisted timing data
    const accumulated = room.accumulatedTime ?? 0;
    let finalDuration = accumulated;
    if (room.startedAt && !room.pausedAt) {
      const liveSegment = Math.floor((Date.now() - new Date(room.startedAt).getTime()) / 1000);
      if (liveSegment > 0) {
        finalDuration += liveSegment;
      }
    }

    const finalNotes =
      typeof notes === "string" && notes.trim()
        ? notes.trim()
        : applicant.interviewNotes || "";

    const finalOverallFeedback =
      typeof overallFeedback === "string" ? overallFeedback.trim() : "";

    const finalInterviewerId =
      callerInterviewerId || sessionDoc.interviewerId || "";
    const finalInterviewerName =
      session.interviewerName || sessionDoc.interviewerName || "Interviewer";
    const finalEventId =
      sessionDoc.eventId || room.eventId || applicant.eventId || "";

    // 8. Atomic Persistence with Database Transaction (Strict: no partial-success fallback)
    const mongoSession = await mongoose.startSession();
    let createdInterviewId: any = null;

    try {
      mongoSession.startTransaction();

      // A. Update Applicant's latest criteriaEvaluation snapshot & decision
      await Applicant.updateOne(
        { _id: applicant._id },
        {
          $set: {
            criteriaEvaluation: {
              rubricVersion: RUBRIC_VERSION,
              path: pathConfig.id,
              criteria: criterionSnapshots,
              dimensions: criterionSnapshots,
              overallFeedback: finalOverallFeedback,
              totalWeightedScore,
              isComplete: true,
              evaluatedAt: new Date(),
              interviewSessionId: interviewSessionId.trim(),
              interviewerId: finalInterviewerId,
              interviewerName: finalInterviewerName,
            },
            interviewStatus: decision,
            finalDecision: decision,
            interviewDuration: finalDuration,
            interviewNotes: finalNotes,
            assignedRoom: null,
          },
        },
        { session: mongoSession }
      );

      // B. Create immutable Interview history record
      const createdDocs = await Interview.create(
        [
          {
            interviewSessionId: interviewSessionId.trim(),
            applicantId: applicant._id,
            interviewerId: finalInterviewerId,
            interviewerName: finalInterviewerName,
            clerkUserId: callerClerkUserId,
            eventId: finalEventId,
            path: pathConfig.id,
            roomNumber: room.roomNumber,
            status: "Completed",
            decision: decision as Decision,
            notes: finalNotes,
            duration: finalDuration,
            startTime: room.startedAt || sessionDoc.startedAt || new Date(),
            endTime: new Date(),
            criteriaEvaluation: {
              rubricVersion: RUBRIC_VERSION,
              path: pathConfig.id,
              criteria: criterionSnapshots,
              dimensions: criterionSnapshots,
              overallFeedback: finalOverallFeedback,
              totalWeightedScore,
              isComplete: true,
              evaluatedAt: new Date(),
              interviewSessionId: interviewSessionId.trim(),
              interviewerId: finalInterviewerId,
              interviewerName: finalInterviewerName,
            },
          },
        ],
        { session: mongoSession }
      );
      const newInterview = Array.isArray(createdDocs) ? createdDocs[0] : createdDocs;
      createdInterviewId = (newInterview as any)?._id;

      // C. Mark InterviewSession completed
      await InterviewSession.updateOne(
        { sessionId: interviewSessionId.trim() },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
          },
        },
        { session: mongoSession }
      );

      // D. Safe Room Release — strictly matching roomNumber, applicant, interviewSessionId, and eventId
      // Mandatory: Never conditionally skip the event filter
      const roomReleaseFilter = {
        roomNumber: room.roomNumber,
        applicant: applicant._id,
        interviewSessionId: interviewSessionId.trim(),
        eventId: sessionEventId,
      };

      await InterviewRoom.updateOne(
        roomReleaseFilter,
        {
          $set: {
            status: "Available",
            applicant: null,
            interviewSessionId: null,
            startedAt: null,
            pausedAt: null,
            accumulatedTime: 0,
          },
        },
        { session: mongoSession }
      );

      await mongoSession.commitTransaction();
    } catch (saveError: any) {
      if (mongoSession.inTransaction()) {
        await mongoSession.abortTransaction();
      }
      console.error("POST /api/interviewer/workspace/end Transaction Error:", saveError);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to commit interview evaluation: ${saveError.message || "Database transaction error."}`,
        },
        { status: 500 }
      );
    } finally {
      await mongoSession.endSession();
    }

    return NextResponse.json({
      success: true,
      interviewId: createdInterviewId,
      path: pathConfig.id,
      totalWeightedScore,
      duration: finalDuration,
      decision,
    });
  } catch (error: any) {
    console.error("POST /api/interviewer/workspace/end Fatal Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
