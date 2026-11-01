import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Applicant from "@/models/Applicant";
import { getAuthSession } from "@/lib/auth";
import { getActiveEventId } from "@/lib/activeEvent";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const eventId = searchParams.get("eventId");

    await connectToDatabase();
    const session = await getAuthSession();
    const activeEventId = await getActiveEventId();

    const queryCondition: any = {
      interviewStatus: "Waiting",
      $or: [
        { assignedRoom: null },
        { assignedRoom: { $exists: false } }
      ]
    };

    // Interviewers are strictly constrained to the active event.
    // Admins can view other events only if explicitly requested.
    let targetEventId = activeEventId;
    if (session.role === "admin" && eventId) {
      targetEventId = eventId;
    }

    if (targetEventId && targetEventId !== "all") {
      queryCondition.eventId = targetEventId;
    }

    if (query && query.trim().length > 0) {
      const regex = new RegExp(query.trim(), "i");
      queryCondition.$and = [
        {
          $or: [
            { name: { $regex: regex } },
            { rollNumber: { $regex: regex } }
          ]
        }
      ];
    }

    const applicants = await Applicant.find(queryCondition)
      .select("_id name rollNumber department year teamApplied source eventId")
      .limit(50)
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      activeEventId,
      applicants,
    });
  } catch (error: any) {
    console.error("Applicant Search API Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search applicants" },
      { status: 500 }
    );
  }
}
