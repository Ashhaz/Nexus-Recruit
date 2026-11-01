import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Applicant from "@/models/Applicant";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicantId, duration, notes } = body as {
      applicantId: string;
      duration: number;
      notes?: string;
    };

    if (!applicantId || typeof duration !== "number") {
      return NextResponse.json(
        { success: false, error: "applicantId and duration are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const updateFields: any = { interviewDuration: duration };
    if (typeof notes === "string" && notes.trim().length > 0) {
      updateFields.interviewNotes = notes.trim();
    }

    await Applicant.updateOne(
      { _id: applicantId },
      { $set: updateFields }
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
