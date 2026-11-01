import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import InterviewRoom from "@/models/InterviewRoom";
import Applicant from "@/models/Applicant";
import { getActiveEventSource } from "@/lib/activeEvent";
import { getAuthSession } from "@/lib/auth";

/**
 * GET /api/interviewer/dashboard?name=Mudabeer
 *
 * Returns the room + full applicant (with responses) assigned to the given interviewer.
 */
export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (session.role === "unauthorized") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please sign in." },
        { status: 401 }
      );
    }
    if (session.role !== "interviewer") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Interviewer access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name")?.trim();

    if (!name) {
      return NextResponse.json(
        { success: false, error: "?name= query param is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find the room occupied by this interviewer (case-insensitive)
    const room = await InterviewRoom.findOne({
      interviewer: { $regex: new RegExp(`^${name}$`, "i") },
      status: "Occupied",
    }).lean();

    if (!room) {
      return NextResponse.json(
        {
          success: false,
          error: `No occupied room found for interviewer "${name}". Ensure the admin has assigned a candidate.`,
        },
        { status: 404 }
      );
    }

    if (!room.applicant) {
      return NextResponse.json(
        { success: false, error: "Room is occupied but no applicant is linked." },
        { status: 404 }
      );
    }

    // Fetch full applicant document (including responses)
    const applicant = await Applicant.findById(room.applicant).lean();
    if (!applicant) {
      return NextResponse.json(
        { success: false, error: "Applicant record not found." },
        { status: 404 }
      );
    }

    // Elapsed time in seconds
    const startedAt = room.startedAt ? new Date(room.startedAt) : null;
    let elapsedSeconds = (room as any).accumulatedTime ?? 0;
    if (startedAt && !room.pausedAt) {
      elapsedSeconds += Math.floor((Date.now() - startedAt.getTime()) / 1000);
    }

    // interviewStatus drives the "started" flag
    const started = (applicant as any).interviewStatus === "Interviewing";
    const activeEvent = await getActiveEventSource();

    return NextResponse.json({
      success: true,
      activeEvent: activeEvent ? { _id: String(activeEvent._id), name: activeEvent.name } : null,
      interviewer: { name: room.interviewer },
      room: {
        roomNumber: room.roomNumber,
        status: room.status,
        startedAt: startedAt ? startedAt.toISOString() : null,
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
        teamApplied: (applicant as any).teamApplied ?? null,
        interviewStatus: (applicant as any).interviewStatus,
        responses: (applicant as any).responses ?? {},
        interviewNotes: (applicant as any).interviewNotes ?? "",
        finalDecision: (applicant as any).finalDecision ?? "",
      },
      interview: {
        started,
        elapsedSeconds,
        startedAt: startedAt ? startedAt.toISOString() : null,
      },
    });
  } catch (error: any) {
    console.error("GET /api/interviewer/dashboard Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
