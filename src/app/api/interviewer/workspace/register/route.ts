import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAuthSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import InterviewRoom from "@/models/InterviewRoom";
import InterviewerProfile from "@/models/InterviewerProfile";

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
    if (session.role !== "interviewer" && session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: unauthorized role" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const room = await InterviewRoom.findOne({ roomNumber: Number(roomNumber) });
    if (!room) {
      return NextResponse.json(
        { success: false, error: "Room not found." },
        { status: 404 }
      );
    }

    if (room.isActive === false) {
      return NextResponse.json(
        { success: false, error: `Room ${room.roomNumber} is currently deactivated.` },
        { status: 400 }
      );
    }

    if (room.status !== "Available") {
      return NextResponse.json(
        { success: false, error: "Room is not available." },
        { status: 400 }
      );
    }

    // Room-specific access authorization:
    // If the room has an assigned interviewer, ensure the identity matches (unless admin is conducting)
    const normalizedInput = interviewerName.trim().toLowerCase();
    if (
      room.assignedInterviewer &&
      room.assignedInterviewer.trim().length > 0 &&
      session.role !== "admin"
    ) {
      if (room.assignedInterviewer.trim().toLowerCase() !== normalizedInput) {
        return NextResponse.json(
          {
            success: false,
            error: `Interviewer "${interviewerName}" is not authorized for Room ${room.roomNumber}. Assigned interviewer is "${room.assignedInterviewer}".`,
          },
          { status: 403 }
        );
      }
    }

    // Validate physical interviewer configurations server-side
    const INTERVIEWER_CONFIG: Record<string, string> = {
      [process.env.INTERVIEWER_1_ID || "INT1"]: process.env.INTERVIEWER_1_NAME || "Ahmed",
      [process.env.INTERVIEWER_2_ID || "INT2"]: process.env.INTERVIEWER_2_NAME || "Sarah",
      [process.env.INTERVIEWER_3_ID || "INT3"]: process.env.INTERVIEWER_3_NAME || "Mudabeer",
    };
    
    let resolvedInterviewerId: string | null = null;
    let resolvedInterviewerName: string | null = null;

    for (const [id, name] of Object.entries(INTERVIEWER_CONFIG)) {
      if (name.trim().toLowerCase() === normalizedInput) {
        resolvedInterviewerId = id;
        resolvedInterviewerName = name;
        break;
      }
    }

    // Also check if matches an existing active InterviewerProfile document
    if (!resolvedInterviewerId) {
      try {
        const profile = await InterviewerProfile.findOne({
          name: { $regex: new RegExp(`^${interviewerName.trim()}$`, "i") },
          isArchived: { $ne: true },
        }).lean();
        if (profile) {
          resolvedInterviewerId = String(profile._id);
          resolvedInterviewerName = profile.name;
        }
      } catch (err) {
        console.warn("InterviewerProfile lookup error:", err);
      }
    }

    if (!resolvedInterviewerId) {
      if (
        room.assignedInterviewer &&
        room.assignedInterviewer.trim().toLowerCase() === normalizedInput
      ) {
        resolvedInterviewerId = room.assignedInterviewerId || `INT_${room.roomNumber}`;
        resolvedInterviewerName = room.assignedInterviewer;
      }
    }

    if (!resolvedInterviewerId || !resolvedInterviewerName) {
      return NextResponse.json(
        { success: false, error: `Interviewer "${interviewerName}" is not authorized.` },
        { status: 400 }
      );
    }

    // Check if this physical interviewer already owns another active room
    const activeRoomForInterviewer = await InterviewRoom.findOne({
      interviewerId: resolvedInterviewerId,
      status: { $ne: "Available" },
    });

    if (activeRoomForInterviewer) {
      return NextResponse.json(
        {
          success: false,
          error: `Physical interviewer ${resolvedInterviewerName} already has an active room: Room ${activeRoomForInterviewer.roomNumber}.`,
        },
        { status: 409 }
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
