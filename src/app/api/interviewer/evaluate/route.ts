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

    // Persist evaluation on the Applicant
    await Applicant.updateOne(
      { _id: applicantId },
      {
        $set: {
          interviewStatus,
          finalDecision: decision,
          interviewNotes: notes,
          // Store ratings as a nested map so the Results drawer can display them
          "evaluation.technical":    ratings.technical,
          "evaluation.communication":ratings.communication,
          "evaluation.confidence":   ratings.confidence,
          "evaluation.leadership":   ratings.leadership,
          "evaluation.teamwork":     ratings.teamwork,
        },
      }
    );

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
