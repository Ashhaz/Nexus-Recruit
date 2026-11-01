import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Applicant from "@/models/Applicant";
import InterviewRoom from "@/models/InterviewRoom";
import { getGlobalEvaluationConfig } from "@/lib/evaluationConfig";

/**
 * POST /api/interviewer/evaluate
 * Body: {
 *   applicantId: string,
 *   roomNumber:  number,
 *   ratings?:    Record<string, number>,
 *   criteriaSnapshot?: Array<{ id: string, label: string, score: number, maxScore: number }>,
 *   notes:       string,
 *   decision:    "Approved" | "Pending" | "Discussion Needed"
 * }
 *
 * Persists ratings, immutable criteria snapshot, notes and decision onto the Applicant document.
 * Frees the room (sets status back to Available, clears applicant ref).
 * Updates applicant interviewStatus to match the decision.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicantId, roomNumber, ratings, criteriaSnapshot, notes, decision } = body as {
      applicantId: string;
      roomNumber: number;
      ratings?: Record<string, number>;
      criteriaSnapshot?: Array<{
        id: string;
        label: string;
        score: number;
        maxScore: number;
      }>;
      notes: string;
      decision: "Approved" | "Pending" | "Discussion Needed";
    };

    if (!applicantId || !roomNumber || !decision) {
      return NextResponse.json(
        { success: false, error: "applicantId, roomNumber and decision are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Load active global evaluation configuration for validation and fallback
    const globalConfig = await getGlobalEvaluationConfig();

    let finalSnapshot: Array<{
      id: string;
      label: string;
      score: number;
      maxScore: number;
    }> = [];

    if (Array.isArray(criteriaSnapshot) && criteriaSnapshot.length > 0) {
      finalSnapshot = criteriaSnapshot.map((item) => {
        const maxScore = Math.max(1, Number(item.maxScore) || 10);
        const score = Math.max(0, Math.min(Number(item.score) || 0, maxScore));
        return {
          id: String(item.id || `crit_${Math.random().toString(36).substring(2, 7)}`),
          label: String(item.label || "").trim() || "Criterion",
          score,
          maxScore,
        };
      });
    } else {
      // Build snapshot from active global criteria + ratings payload
      finalSnapshot = globalConfig.criteria.map((crit) => {
        const rawScore = ratings?.[crit.id] ?? ratings?.[crit.name.toLowerCase()] ?? ratings?.[crit.name] ?? 0;
        const maxScore = crit.maxScore || 10;
        const score = Math.max(0, Math.min(Number(rawScore) || 0, maxScore));
        return {
          id: crit.id,
          label: crit.name,
          score,
          maxScore,
        };
      });
    }

    // Map decision → interviewStatus
    const statusMap: Record<string, string> = {
      Approved:            "Approved",
      Pending:             "Pending",
      "Discussion Needed": "Discussion Needed",
    };
    const interviewStatus = statusMap[decision] ?? "Pending";

    // Read the room's timer state BEFORE clearing it so we can
    // calculate the actual interview duration.
    const room = await InterviewRoom.findOne({ roomNumber });
    let interviewDuration = 0;
    if (room) {
      const accumulated = room.accumulatedTime ?? 0;
      // If the timer is still running (not paused), add the live segment
      if (room.startedAt && !room.pausedAt) {
        interviewDuration =
          accumulated +
          Math.floor((Date.now() - new Date(room.startedAt).getTime()) / 1000);
      } else {
        interviewDuration = accumulated;
      }
    }

    // If the /workspace/end route already saved a duration, keep the
    // larger value so we never lose a previously-persisted measurement.
    const existingApplicant = await Applicant.findById(applicantId).select(
      "interviewDuration interviewNotes evaluation"
    );
    if (
      existingApplicant?.interviewDuration &&
      existingApplicant.interviewDuration > interviewDuration
    ) {
      interviewDuration = existingApplicant.interviewDuration;
    }

    // Build the $set payload
    const updateFields: Record<string, unknown> = {
      interviewStatus,
      finalDecision: decision,
      interviewDuration,
      "evaluation.criteriaSnapshot": finalSnapshot,
      "evaluation.submittedAt": new Date(),
    };

    // Populate legacy five rating fields if corresponding criterion exists or was sent in ratings
    for (const snap of finalSnapshot) {
      const lower = snap.label.toLowerCase();
      if (["technical", "communication", "confidence", "leadership", "teamwork"].includes(lower)) {
        updateFields[`evaluation.${lower}`] = snap.score;
      }
    }
    if (ratings && typeof ratings === "object") {
      for (const k of ["technical", "communication", "confidence", "leadership", "teamwork"]) {
        if (typeof (ratings as any)[k] === "number" && updateFields[`evaluation.${k}`] === undefined) {
          updateFields[`evaluation.${k}`] = (ratings as any)[k];
        }
      }
    }

    if (typeof notes === "string" && notes.trim().length > 0) {
      updateFields.interviewNotes = notes.trim();
    } else if (existingApplicant?.interviewNotes) {
      updateFields.interviewNotes = existingApplicant.interviewNotes;
    }

    // Persist evaluation on the Applicant
    await Applicant.updateOne({ _id: applicantId }, { $set: updateFields });

    // Free the room (but preserve physical interviewer ownership)
    await InterviewRoom.updateOne(
      { roomNumber },
      {
        $set: {
          status:      "Available",
          applicant:   null,
          startedAt:   null,
          pausedAt:    null,
          accumulatedTime: 0,
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/interviewer/evaluate Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
