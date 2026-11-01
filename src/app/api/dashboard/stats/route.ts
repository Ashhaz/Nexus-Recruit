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
