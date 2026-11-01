import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Applicant from "@/models/Applicant";
import { getActiveEventId } from "@/lib/activeEvent";
import { getAuthSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (session.role === "unauthorized") {
      return NextResponse.json({ success: false, error: "Unauthorized: Please sign in." }, { status: 401 });
    }
    if (session.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden: Administrator access required." }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    let eventId = searchParams.get("eventId");
    if (!eventId || eventId === "active") {
      eventId = await getActiveEventId();
    }
    const query = eventId && eventId !== "all" ? { eventId } : {};

    const applicants = await Applicant.find(
      query,
      {
        name: 1,
        rollNumber: 1,
        department: 1,
        branch: 1,
        year: 1,
        email: 1,
        phone: 1,
        interviewStatus: 1,
        assignedRoom: 1,
        assignedInterviewer: 1,
        interviewDuration: 1,
        finalDecision: 1,
        interviewNotes: 1,
        teamApplied: 1,
        evaluation: 1,
        responses: 1,
        source: 1,
        sourceId: 1,
        eventId: 1,
        updatedAt: 1
      }
    ).lean();

    return NextResponse.json({
      success: true,
      activeEventId: eventId !== "all" ? eventId : null,
      applicants
    });
  } catch (error: any) {
    console.error("Dashboard Applicants API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "An unknown error occurred"
      },
      { status: 500 }
    );
  }
}
