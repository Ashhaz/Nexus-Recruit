import { NextResponse } from "next/server";
import crypto from "crypto";
import connectToDatabase from "@/lib/mongodb";
import InterviewRoom from "@/models/InterviewRoom";
import InterviewSession from "@/models/InterviewSession";
import Applicant from "@/models/Applicant";
import { getAuthSession } from "@/lib/auth";
import { getActiveEventSource } from "@/lib/activeEvent";
import { detectApplicantPath } from "@/lib/dimensions";

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

    const session = await getAuthSession();
    if (session.role === "unauthorized") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please sign in." },
        { status: 401 }
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

    if (session.role !== "interviewer") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Interviewer access required." },
        { status: 403 }
      );
    }

    if (room.isActive === false) {
      return NextResponse.json(
        { success: false, error: `Room ${roomNumber} is currently deactivated.` },
        { status: 403 }
      );
    }

    const activeEvent = await getActiveEventSource();

    if (!room.applicant) {
      return NextResponse.json({
        success: true,
        activeEvent: activeEvent ? { _id: String(activeEvent._id), name: activeEvent.name } : null,
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

    let sessionId = (room as any).interviewSessionId;
    if (!sessionId && room.applicant) {
      const generatedId = crypto.randomUUID();
      const updated = await InterviewRoom.findOneAndUpdate(
        {
          _id: room._id,
          applicant: room.applicant,
          $or: [{ interviewSessionId: null }, { interviewSessionId: "" }],
        },
        { $set: { interviewSessionId: generatedId } },
        { new: true }
      );
      sessionId = updated?.interviewSessionId || generatedId;
      try {
        await InterviewSession.create({
          sessionId,
          applicantId: room.applicant,
          roomNumber: room.roomNumber,
          eventId: room.eventId || (activeEvent ? String(activeEvent._id) : ""),
          interviewerId: room.interviewerId || session.interviewerId || "",
          interviewerName: room.interviewer || session.interviewerName || "",
          clerkUserId: session.clerkUserId || "",
          status: "active",
          startedAt: room.startedAt || new Date(),
        });
      } catch (_) {}
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
      activeEvent: activeEvent ? { _id: String(activeEvent._id), name: activeEvent.name } : null,
      room: {
        roomNumber: room.roomNumber,
        interviewerId: room.interviewerId ?? "",
        interviewer: room.interviewer ?? "",
        interviewSessionId: sessionId ?? null,
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
        appliedPath: (applicant as any).appliedPath || detectApplicantPath((applicant as any).responses) || null,
        criteriaEvaluation: (applicant as any).criteriaEvaluation ?? null,
        dimensionEvaluation: (applicant as any).dimensionEvaluation ?? null,
        responses: (applicant as any).responses ?? {},
        interviewDuration: (applicant as any).interviewDuration ?? 0,
        interviewNotes: (applicant as any).interviewNotes ?? "",
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
