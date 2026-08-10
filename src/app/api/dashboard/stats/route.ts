import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Applicant from "@/models/Applicant";

export async function GET() {
  try {
    await connectToDatabase();

    const [
      totalApplicants,
      waiting,
      interviewing,
      approved,
      pending,
      discussionNeeded,
    ] = await Promise.all([
      Applicant.countDocuments(),
      Applicant.countDocuments({ interviewStatus: "Waiting" }),
      Applicant.countDocuments({ interviewStatus: "Interviewing" }),
      Applicant.countDocuments({ interviewStatus: "Approved" }),
      Applicant.countDocuments({ interviewStatus: "Pending" }),
      Applicant.countDocuments({ interviewStatus: "Discussion Needed" }),
    ]);

    return NextResponse.json({
      success: true,
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
