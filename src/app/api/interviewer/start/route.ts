import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import InterviewRoom from "@/models/InterviewRoom";
import Applicant from "@/models/Applicant";

/**
 * POST /api/interviewer/start
 * Body: { roomNumber: number }
 *
 * Sets the room startedAt to now and marks the applicant status as
 * "Interviewing".  Idempotent: calling it again just updates startedAt.
 */
export async function POST(request: Request) {
  try {
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
    room.status = "Occupied";
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
