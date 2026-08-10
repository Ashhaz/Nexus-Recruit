import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import InterviewRoom from "@/models/InterviewRoom";
import Applicant from "@/models/Applicant";

export async function POST(request: Request) {
  try {
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

    // Find and update the room
    const room = await InterviewRoom.findOne({ roomNumber });
    if (!room) {
      return NextResponse.json(
        { success: false, error: `Room ${roomNumber} not found` },
        { status: 404 }
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
