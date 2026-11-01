import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Applicant from "@/models/Applicant";
import Interview from "@/models/Interview"; // Needed so Mongoose registers the model
import { getActiveEventId } from "@/lib/activeEvent";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    // Ensure Interview model is initialized by calling it
    Interview.init();

    const { searchParams } = new URL(request.url);
    let eventId = searchParams.get("eventId");
    if (!eventId || eventId === "active") {
      eventId = await getActiveEventId();
    }

    const pipeline: any[] = [];
    if (eventId && eventId !== "all") {
      pipeline.push({ $match: { eventId } });
    }

    pipeline.push(
      {
        $lookup: {
          from: "interviews",
          localField: "_id",
          foreignField: "applicantId",
          as: "interviewData",
        },
      },
      {
        $addFields: {
          // Take the first interview document
          interview: { $arrayElemAt: ["$interviewData", 0] },
        },
      },
      {
        $project: {
          interviewData: 0, 
        },
      },
      {
        $sort: { createdAt: -1 }, 
      }
    );

    // Use aggregation to fetch applicants and lookup their interview data
    const results = await Applicant.aggregate(pipeline);

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error("GET /api/results Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch results" },
      { status: 500 }
    );
  }
}
