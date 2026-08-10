import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAuthSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import InterviewRoom from "@/models/InterviewRoom";

export async function POST(request: Request) {
  try {
    const { roomNumber } = await request.json();

    if (!roomNumber) {
      return NextResponse.json(
        { success: false, error: "Missing roomNumber." },
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

    const interviewerName = session.name || "Unknown Interviewer";

    await connectToDatabase();

    const room = await InterviewRoom.findOne({ roomNumber: Number(roomNumber) });
    if (!room) {
      return NextResponse.json(
        { success: false, error: "Room not found." },
        { status: 404 }
      );
    }

    room.interviewer = interviewerName;
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
