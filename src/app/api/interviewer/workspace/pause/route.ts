import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import InterviewRoom from "@/models/InterviewRoom";

export async function POST(request: Request) {
  try {
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

    // Check if the timer is already paused
    if (room.pausedAt) {
      return NextResponse.json({
        success: true,
        message: "Timer is already paused.",
        room: {
          startedAt: room.startedAt ?? null,
          pausedAt: room.pausedAt,
          accumulatedTime: room.accumulatedTime,
        }
      });
    }

    // Ensure startedAt is set
    if (!room.startedAt) {
      return NextResponse.json(
        { success: false, error: "Interview has not started yet." },
        { status: 400 }
      );
    }

    // Calculate elapsed time in the current segment and accumulate
    const segmentTime = Math.floor((Date.now() - new Date(room.startedAt).getTime()) / 1000);
    room.accumulatedTime = (room.accumulatedTime || 0) + (segmentTime > 0 ? segmentTime : 0);
    room.pausedAt = new Date();
    room.startedAt = null;

    await room.save();

    return NextResponse.json({
      success: true,
      room: {
        startedAt: room.startedAt ?? null,
        pausedAt: room.pausedAt,
        accumulatedTime: room.accumulatedTime,
      }
    });
  } catch (error: any) {
    console.error("POST /api/interviewer/workspace/pause Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
