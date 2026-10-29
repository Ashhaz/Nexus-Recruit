import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Applicant from "@/models/Applicant";
import InterviewRoom from "@/models/InterviewRoom";

/**
 * POST /api/interviewer/evaluate
 * Body: {
 *   applicantId: string,
 *   roomNumber:  number,
 *   ratings:     { technical, communication, confidence, leadership, teamwork },
 *   notes:       string,
 *   decision:    "Approved" | "Pending" | "Discussion Needed"
 * }
 *
 * Persists ratings, notes and decision onto the Applicant document.
 * Frees the room (sets status back to Available, clears applicant ref).
 * Updates applicant interviewStatus to match the decision.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicantId, roomNumber, ratings, notes, decision } = body as {
      applicantId: string;
      roomNumber: number;
      ratings: {
        technical: number;
        communication: number;
        confidence: number;
        leadership: number;
        teamwork: number;
      };
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
      "interviewDuration interviewNotes"
    );
    if (
      existingApplicant?.interviewDuration &&
      existingApplicant.interviewDuration > interviewDuration
    ) {
      interviewDuration = existingApplicant.interviewDuration;
    }

    // Build the $set payload — only overwrite notes when the caller
    // actually provided a non-empty string, so we never blank out
    // notes that were saved by the "End Interview" step.
    const updateFields: Record<string, unknown> = {
      interviewStatus,
      finalDecision: decision,
      interviewDuration,
      // Store ratings as a nested map so the Results drawer can display them
      "evaluation.technical":     ratings.technical,
      "evaluation.communication": ratings.communication,
      "evaluation.confidence":    ratings.confidence,
      "evaluation.leadership":    ratings.leadership,
      "evaluation.teamwork":      ratings.teamwork,
    };

    if (notes && notes.trim().length > 0) {
      updateFields.interviewNotes = notes;
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
