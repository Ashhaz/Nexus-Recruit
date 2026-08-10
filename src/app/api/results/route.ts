import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Applicant from "@/models/Applicant";
import Interview from "@/models/Interview"; // Needed so Mongoose registers the model

export async function GET() {
  try {
    await connectToDatabase();
    
    // Ensure Interview model is initialized by calling it
    Interview.init();

    // Use aggregation to fetch applicants and lookup their interview data
    const results = await Applicant.aggregate([
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
      },
    ]);

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error("GET /api/results Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch results" },
      { status: 500 }
    );
  }
}
