import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Applicant from "@/models/Applicant";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicantId, duration } = body as {
      applicantId: string;
      duration: number;
    };

    if (!applicantId || typeof duration !== "number") {
      return NextResponse.json(
        { success: false, error: "applicantId and duration are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    await Applicant.updateOne(
      { _id: applicantId },
      { $set: { interviewDuration: duration } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/interviewer/workspace/end Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
