import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import InterviewRoom from "@/models/InterviewRoom";
import Applicant from "@/models/Applicant";
import { getActiveEventId } from "@/lib/activeEvent";
import { getAuthSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (session.role === "unauthorized") {
      return NextResponse.json({ success: false, error: "Unauthorized: Please sign in." }, { status: 401 });
    }
    if (session.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden: Administrator access required." }, { status: 403 });
    }

    const body = await request.json();
    const { roomNumber, applicantId, interviewer } = body as {
      roomNumber: number;
      applicantId: string;
      interviewer: string;
    };

    if (!roomNumber || !applicantId || !interviewer?.trim()) {
      return NextResponse.json(
        { success: false, error: "roomNumber, applicantId and interviewer are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const activeEventId = await getActiveEventId();

    const candidate = await Applicant.findById(applicantId);
    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Applicant not found" },
        { status: 404 }
      );
    }

    if (activeEventId && candidate.eventId !== activeEventId) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot assign candidate: Candidate does not belong to the currently active recruitment event."
        },
        { status: 403 }
      );
    }

    // Find and update the room
    const room = await InterviewRoom.findOne({ roomNumber });
    if (!room) {
      return NextResponse.json(
        { success: false, error: `Room ${roomNumber} not found` },
        { status: 404 }
      );
    }

    if (room.isActive === false) {
      return NextResponse.json(
        { success: false, error: `Room ${roomNumber} is currently deactivated` },
        { status: 400 }
      );
    }

    room.applicant = applicantId as any;
    room.interviewer = interviewer.trim();
    room.status = "Occupied";
    room.startedAt = new Date();
    await room.save();

    // Update the applicant's interview status
    await Applicant.updateOne(
      { _id: applicantId },
      { $set: { interviewStatus: "Interviewing" } }
    );

    return NextResponse.json({
      success: true,
      message: `Applicant assigned to Room ${roomNumber}`,
    });
  } catch (error: any) {
    console.error("POST /api/rooms/assign Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to assign applicant" },
      { status: 500 }
    );
  }
}
