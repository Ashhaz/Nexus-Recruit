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
    const baseQuery = eventId && eventId !== "all" ? { eventId } : {};

    const [
      totalApplicants,
      waiting,
      interviewing,
      approved,
      pending,
      discussionNeeded,
    ] = await Promise.all([
      Applicant.countDocuments(baseQuery),
      Applicant.countDocuments({ ...baseQuery, interviewStatus: "Waiting" }),
      Applicant.countDocuments({ ...baseQuery, interviewStatus: "Interviewing" }),
      Applicant.countDocuments({ ...baseQuery, interviewStatus: "Approved" }),
      Applicant.countDocuments({ ...baseQuery, interviewStatus: "Pending" }),
      Applicant.countDocuments({ ...baseQuery, interviewStatus: "Discussion Needed" }),
    ]);

    return NextResponse.json({
      success: true,
      activeEventId: eventId !== "all" ? eventId : null,
      data: {
        totalApplicants,
        waiting,
        interviewing,
        approved,
        pending,
        discussionNeeded,
      },
    });
  } catch (error: any) {
    console.error("Dashboard Stats API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
