import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Applicant from "@/models/Applicant";

export async function GET() {
  try {
    await connectToDatabase();
    const applicants = await Applicant.find(
      {},
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
        updatedAt: 1
      }
    ).lean();

    return NextResponse.json({
      success: true,
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
