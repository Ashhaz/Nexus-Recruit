import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Applicant from "@/models/Applicant";
import { getActiveEventId } from "@/lib/activeEvent";

export async function GET(request: Request) {
  try {
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
