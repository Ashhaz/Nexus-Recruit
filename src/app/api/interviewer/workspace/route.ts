import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import InterviewRoom from "@/models/InterviewRoom";
import Applicant from "@/models/Applicant";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomNumber = searchParams.get("room");

    if (!roomNumber) {
      return NextResponse.json(
        { success: false, error: "?room= query param is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const room = await InterviewRoom.findOne({ roomNumber: Number(roomNumber) }).lean();

    if (!room) {
      return NextResponse.json(
        { success: false, error: `Room ${roomNumber} not found.` },
        { status: 404 }
      );
    }

    if (!room.applicant) {
      return NextResponse.json({
        success: true,
        room: {
          roomNumber: room.roomNumber,
          interviewerId: room.interviewerId ?? "",
          interviewer: room.interviewer ?? "",
          status: room.status,
          startedAt: room.startedAt ?? null,
          pausedAt: room.pausedAt ?? null,
          accumulatedTime: room.accumulatedTime ?? 0,
        },
        applicant: null,
      });
    }

    const applicant = await Applicant.findById(room.applicant).lean();
    if (!applicant) {
      return NextResponse.json(
        { success: false, error: "Applicant not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      room: {
        roomNumber: room.roomNumber,
        interviewerId: room.interviewerId ?? "",
        interviewer: room.interviewer ?? "",
        status: room.status,
        startedAt: room.startedAt ?? null,
        pausedAt: room.pausedAt ?? null,
        accumulatedTime: room.accumulatedTime ?? 0,
      },
      applicant: {
        _id: String(applicant._id),
        name: (applicant as any).name,
        rollNumber: (applicant as any).rollNumber,
        department: (applicant as any).department ?? null,
        branch: (applicant as any).branch ?? null,
        year: (applicant as any).year ?? null,
        email: (applicant as any).email ?? null,
        phone: (applicant as any).phone ?? null,
        responses: (applicant as any).responses ?? {},
        interviewDuration: (applicant as any).interviewDuration ?? 0,
      },
    });
  } catch (error: any) {
    console.error("GET /api/interviewer/workspace Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
