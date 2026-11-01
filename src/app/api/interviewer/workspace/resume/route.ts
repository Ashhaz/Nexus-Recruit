import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import InterviewRoom from "@/models/InterviewRoom";
import { getAuthSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (session.role !== "interviewer") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Interviewer access required." },
        { status: 403 }
      );
    }

    const { roomNumber, interviewerId, interviewerName } = await request.json();

    if (!roomNumber || !interviewerId || !interviewerName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: roomNumber, interviewerId, or interviewerName." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const room = await InterviewRoom.findOne({ roomNumber: Number(roomNumber) });
    if (!room) {
      return NextResponse.json(
        { success: false, error: `Room ${roomNumber} not found.` },
        { status: 404 }
      );
    }

    // Validate that the room is registered to the correct physical interviewer
    if (room.status !== "Occupied" || room.interviewerId !== interviewerId || room.interviewer !== interviewerName) {
      return NextResponse.json(
        { success: false, error: "YOU ARE NOT AUTHORIZED FOR THIS ROOM" },
        { status: 403 }
      );
    }

    if (!room.applicant) {
      return NextResponse.json(
        { success: false, error: "No candidate is active in this room." },
        { status: 400 }
      );
    }

    // Check if the timer is already running (not paused)
    if (room.startedAt && !room.pausedAt) {
      return NextResponse.json({
        success: true,
        message: "Timer is already running.",
        room: {
          startedAt: room.startedAt ?? null,
          pausedAt: room.pausedAt ?? null,
          accumulatedTime: room.accumulatedTime,
        }
      });
    }

    // Start a new running segment
    room.startedAt = new Date();
    room.pausedAt = null;

    await room.save();

    return NextResponse.json({
      success: true,
      room: {
        startedAt: room.startedAt ?? null,
        pausedAt: room.pausedAt ?? null,
        accumulatedTime: room.accumulatedTime,
      }
    });
  } catch (error: any) {
    console.error("POST /api/interviewer/workspace/resume Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
