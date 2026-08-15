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
    if (room.interviewerId !== interviewerId || room.interviewer !== interviewerName) {
      return NextResponse.json(
        { success: false, error: "YOU ARE NOT AUTHORIZED FOR THIS ROOM" },
        { status: 403 }
      );
    }

    // Safety check: Cannot leave if an applicant is assigned to the room
    if (room.applicant) {
      return NextResponse.json(
        { success: false, error: "CANNOT LEAVE ROOM WHILE AN INTERVIEW IS ACTIVE." },
        { status: 400 }
      );
    }

    // Release the room atomically
    room.status = "Available";
    room.applicant = null;
    room.interviewer = "";
    room.interviewerId = "";
    room.startedAt = null;
    room.pausedAt = null;
    room.accumulatedTime = 0;

    await room.save();

    return NextResponse.json({
      success: true,
      room
    });
  } catch (error: any) {
    console.error("POST /api/interviewer/workspace/leave Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
