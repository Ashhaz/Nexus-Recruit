import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAuthSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import InterviewRoom from "@/models/InterviewRoom";
import InterviewerProfile from "@/models/InterviewerProfile";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const roomNumber = body.roomNumber;
    let interviewerName = body.interviewerName;

    if (!roomNumber) {
      return NextResponse.json(
        { success: false, error: "Missing required field: roomNumber." },
        { status: 400 }
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please sign in." },
        { status: 401 }
      );
    }

    const session = await getAuthSession();
    if (session.role !== "interviewer") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Interviewer access required." },
        { status: 403 }
      );
    }

    // Default to authenticated session name if not passed from client
    if (!interviewerName && session.interviewerName) {
      interviewerName = session.interviewerName;
    }

    if (!interviewerName) {
      return NextResponse.json(
        { success: false, error: "Missing required field: interviewerName." },
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

    if (room.isActive === false) {
      return NextResponse.json(
        { success: false, error: `Room ${room.roomNumber} is currently deactivated.` },
        { status: 400 }
      );
    }

    // Resolve physical interviewer configurations server-side
    const normalizedInput = (session.role === "interviewer" ? session.interviewerName || interviewerName : interviewerName).trim().toLowerCase();

    const INTERVIEWER_CONFIG: Record<string, string> = {
      [process.env.INTERVIEWER_1_ID || "INT1"]: process.env.INTERVIEWER_1_NAME || "Ahmed",
      [process.env.INTERVIEWER_2_ID || "INT2"]: process.env.INTERVIEWER_2_NAME || "Amaan",
      [process.env.INTERVIEWER_3_ID || "INT3"]: process.env.INTERVIEWER_3_NAME || "Mudabeer",
    };

    let resolvedInterviewerId: string | null = session.interviewerId || null;
    let resolvedInterviewerName: string | null = session.interviewerName || null;

    if (!resolvedInterviewerId || !resolvedInterviewerName) {
      for (const [id, name] of Object.entries(INTERVIEWER_CONFIG)) {
        if (name.trim().toLowerCase() === normalizedInput) {
          resolvedInterviewerId = id;
          resolvedInterviewerName = name;
          break;
        }
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
          resolvedInterviewerId = profile.interviewerId || String(profile._id);
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

    const finalInterviewerId: string =
      resolvedInterviewerId || session.clerkUserId || `INT_${room.roomNumber}`;
    const finalInterviewerName: string =
      resolvedInterviewerName || interviewerName || "Interviewer";

    // Check if room is already occupied by this exact interviewer (re-entry)
    if (room.status !== "Available") {
      if (
        room.interviewer &&
        room.interviewer.trim().toLowerCase() === finalInterviewerName.trim().toLowerCase()
      ) {
        return NextResponse.json({ success: true, room });
      }
      return NextResponse.json(
        { success: false, error: `Room ${room.roomNumber} is currently occupied by "${room.interviewer}".` },
        { status: 400 }
      );
    }

    // Save registration details
    room.interviewerId = finalInterviewerId;
    room.interviewer = finalInterviewerName;
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
