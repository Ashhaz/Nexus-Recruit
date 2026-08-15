import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import InterviewRoom from "@/models/InterviewRoom";
import Applicant from "@/models/Applicant";

export async function POST(request: Request) {
  try {
    const { roomNumber, applicantId, interviewerId, interviewerName } = await request.json();

    if (!roomNumber || !applicantId || !interviewerId || !interviewerName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: roomNumber, applicantId, interviewerId, or interviewerName." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const room = await InterviewRoom.findOne({ roomNumber: Number(roomNumber) });
    if (!room) {
      return NextResponse.json(
        { success: false, error: "THIS ROOM IS NO LONGER AVAILABLE" },
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

    // Reject the start request if the room already has an active applicant
    if (room.applicant !== null) {
      return NextResponse.json(
        { success: false, error: "THIS ROOM ALREADY HAS AN ACTIVE INTERVIEW" },
        { status: 409 }
      );
    }

    // Atomically assign the candidate only if they are Waiting and assignedRoom is null
    const updateResult = await Applicant.updateOne(
      {
        _id: applicantId,
        interviewStatus: "Waiting",
        $or: [
          { assignedRoom: null },
          { assignedRoom: { $exists: false } }
        ]
      },
      {
        $set: {
          interviewStatus: "Interviewing",
          assignedInterviewer: room.interviewer,
          assignedRoom: room.roomNumber
        }
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "CANDIDATE IS NO LONGER AVAILABLE" },
        { status: 409 }
      );
    }

    // Assign to room and start timer
    room.applicant = applicantId;
    room.status = "Occupied";
    room.startedAt = new Date();
    room.pausedAt = null;
    room.accumulatedTime = 0;
    await room.save();

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    console.error("POST /api/interviewer/workspace/start Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
