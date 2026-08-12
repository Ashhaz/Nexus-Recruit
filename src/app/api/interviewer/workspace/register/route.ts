import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAuthSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import InterviewRoom from "@/models/InterviewRoom";

export async function POST(request: Request) {
  try {
    const { roomNumber, interviewerName } = await request.json();

    if (!roomNumber || !interviewerName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: roomNumber or interviewerName." },
        { status: 400 }
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const session = await getAuthSession();
    if (session.role !== "interviewer") {
      return NextResponse.json(
        { success: false, error: "Forbidden: interviewers only" },
        { status: 403 }
      );
    }

    // Validate physical interviewer configurations server-side
    const INTERVIEWER_CONFIG: Record<string, string> = {
      [process.env.INTERVIEWER_1_ID || "INT1"]: process.env.INTERVIEWER_1_NAME || "Ahmed",
      [process.env.INTERVIEWER_2_ID || "INT2"]: process.env.INTERVIEWER_2_NAME || "Sarah",
      [process.env.INTERVIEWER_3_ID || "INT3"]: process.env.INTERVIEWER_3_NAME || "Mudabeer",
    };

    // Normalize comparison: case-insensitive, trimmed whitespace
    const normalizedInput = interviewerName.trim().toLowerCase();
    
    let resolvedInterviewerId: string | null = null;
    let resolvedInterviewerName: string | null = null;

    for (const [id, name] of Object.entries(INTERVIEWER_CONFIG)) {
      if (name.trim().toLowerCase() === normalizedInput) {
        resolvedInterviewerId = id;
        resolvedInterviewerName = name;
        break;
      }
    }

    if (!resolvedInterviewerId || !resolvedInterviewerName) {
      return NextResponse.json(
        { success: false, error: "Physical interviewer name is not authorized." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if this physical interviewer already owns another active room
    const activeRoomForInterviewer = await InterviewRoom.findOne({
      interviewerId: resolvedInterviewerId,
      status: { $ne: "Available" },
    });

    if (activeRoomForInterviewer) {
      return NextResponse.json(
        {
          success: false,
          error: `Physical interviewer ${resolvedInterviewerId} already has an active room: Room ${activeRoomForInterviewer.roomNumber}.`,
        },
        { status: 409 }
      );
    }

    const room = await InterviewRoom.findOne({ roomNumber: Number(roomNumber) });
    if (!room) {
      return NextResponse.json(
        { success: false, error: "Room not found." },
        { status: 404 }
      );
    }

    if (room.status !== "Available") {
      return NextResponse.json(
        { success: false, error: "Room is not available." },
        { status: 400 }
      );
    }

    // Save registration details
    room.interviewerId = resolvedInterviewerId;
    room.interviewer = resolvedInterviewerName;
    room.status = "Occupied";
    await room.save();

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    console.error("POST /api/interviewer/workspace/register Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
