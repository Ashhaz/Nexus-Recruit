import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import InterviewRoom from "@/models/InterviewRoom";
import Applicant from "@/models/Applicant";
import { getActiveEventId } from "@/lib/activeEvent";
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

    const { roomNumber, applicantId, interviewerId, interviewerName } = await request.json();

    if (!roomNumber || !applicantId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: roomNumber or applicantId." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const activeEventId = await getActiveEventId();

    const room = await InterviewRoom.findOne({ roomNumber: Number(roomNumber) });
    if (!room) {
      return NextResponse.json(
        { success: false, error: "THIS ROOM IS NO LONGER AVAILABLE" },
        { status: 404 }
      );
    }

    if (room.isActive === false) {
      return NextResponse.json(
        { success: false, error: "THIS ROOM IS CURRENTLY DEACTIVATED" },
        { status: 400 }
      );
    }

    // Server-side identity validation: ensure caller matches the registered interviewer
    if (
      room.interviewer &&
      interviewerName &&
      room.interviewer.trim().toLowerCase() !== interviewerName.trim().toLowerCase()
    ) {
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

    // Server-side active event enforcement
    const candidate = await Applicant.findById(applicantId);
    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "CANDIDATE NOT FOUND" },
        { status: 404 }
      );
    }

    if (activeEventId && candidate.eventId !== activeEventId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED: This candidate does not belong to the currently active recruitment event."
        },
        { status: 403 }
      );
    }

    // Atomically assign the candidate only if they are Waiting and assignedRoom is null
    const updateCondition: any = {
      _id: applicantId,
      interviewStatus: "Waiting",
      $or: [
        { assignedRoom: null },
        { assignedRoom: { $exists: false } }
      ]
    };
    if (activeEventId) {
      updateCondition.eventId = activeEventId;
    }

    const updateResult = await Applicant.updateOne(
      updateCondition,
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
