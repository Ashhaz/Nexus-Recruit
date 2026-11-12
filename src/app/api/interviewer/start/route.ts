import { NextResponse } from "next/server";
import crypto from "crypto";
import connectToDatabase from "@/lib/mongodb";
import InterviewRoom from "@/models/InterviewRoom";
import InterviewSession from "@/models/InterviewSession";
import Applicant from "@/models/Applicant";
import { getAuthSession } from "@/lib/auth";

/**
 * POST /api/interviewer/start
 * Body: { roomNumber: number }
 *
 * Sets the room startedAt to now and marks the applicant status as
 * "Interviewing".  Idempotent: calling it again just updates startedAt.
 */
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (session.role === "unauthorized") {
      return NextResponse.json({ success: false, error: "Unauthorized: Please sign in." }, { status: 401 });
    }
    if (session.role !== "interviewer") {
      return NextResponse.json({ success: false, error: "Forbidden: Interviewer access required." }, { status: 403 });
    }

    const body = await request.json();
    const { roomNumber } = body as { roomNumber: number };

    if (!roomNumber) {
      return NextResponse.json(
        { success: false, error: "roomNumber is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const room = await InterviewRoom.findOne({ roomNumber });
    if (!room) {
      return NextResponse.json(
        { success: false, error: `Room ${roomNumber} not found` },
        { status: 404 }
      );
    }

    room.startedAt = new Date();
    room.pausedAt = null;
    room.accumulatedTime = 0;
    room.status = "Occupied";
    if (!room.interviewSessionId && room.applicant) {
      room.interviewSessionId = crypto.randomUUID();
      try {
        await InterviewSession.create({
          sessionId: room.interviewSessionId,
          applicantId: room.applicant,
          roomNumber: room.roomNumber,
          eventId: room.eventId || "",
          interviewerId: room.interviewerId || session.interviewerId || "",
          interviewerName: room.interviewer || session.interviewerName || "",
          clerkUserId: session.clerkUserId || "",
          status: "active",
          startedAt: room.startedAt,
        });
      } catch (_) {}
    }
    await room.save();

    if (room.applicant) {
      await Applicant.updateOne(
        { _id: room.applicant },
        { $set: { interviewStatus: "Interviewing" } }
      );
    }

    return NextResponse.json({
      success: true,
      startedAt: room.startedAt.toISOString(),
    });
  } catch (error: any) {
    console.error("POST /api/interviewer/start Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
