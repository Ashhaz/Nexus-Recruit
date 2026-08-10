import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import InterviewRoom from "@/models/InterviewRoom";
import Applicant from "@/models/Applicant";

export async function POST(request: Request) {
  try {
    const { roomNumber, applicantId } = await request.json();

    if (!roomNumber || !applicantId) {
      return NextResponse.json(
        { success: false, error: "Missing roomNumber or applicantId." },
        { status: 400 }
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

    const applicant = await Applicant.findById(applicantId);
    if (!applicant) {
      return NextResponse.json(
        { success: false, error: "Applicant not found." },
        { status: 404 }
      );
    }

    // Update applicant status
    applicant.interviewStatus = "Interviewing";
    applicant.assignedInterviewer = room.interviewer;
    applicant.assignedRoom = room.roomNumber;
    await applicant.save();

    // Assign to room and start timer
    room.applicant = applicant._id;
    room.status = "Occupied";
    room.startedAt = new Date();
    await room.save();

    return NextResponse.json({ success: true, room, applicant });
  } catch (error: any) {
    console.error("POST /api/interviewer/workspace/start Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
