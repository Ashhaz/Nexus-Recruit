import { NextResponse } from "next/server";
import { getActiveEventId, getActiveEventSource } from "@/lib/activeEvent";
import Applicant from "@/models/Applicant";
import connectToDatabase from "@/lib/mongodb";

export async function GET() {
  try {
    await connectToDatabase();
    const activeEventId = await getActiveEventId();
    const event = await getActiveEventSource();

    let waitingCandidates = 0;
    let totalCandidates = 0;

    if (activeEventId) {
      [totalCandidates, waitingCandidates] = await Promise.all([
        Applicant.countDocuments({ eventId: activeEventId }),
        Applicant.countDocuments({
          eventId: activeEventId,
          interviewStatus: "Waiting",
          $or: [{ assignedRoom: null }, { assignedRoom: { $exists: false } }],
        }),
      ]);
    }

    return NextResponse.json({
      success: true,
      activeEventId,
      event,
      stats: {
        totalCandidates,
        waitingCandidates,
      },
    });
  } catch (error: any) {
    console.error("GET /api/active-event Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve active event." },
      { status: 500 }
    );
  }
}

