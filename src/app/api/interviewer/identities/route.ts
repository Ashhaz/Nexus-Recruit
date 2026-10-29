import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import InterviewerProfile from "@/models/InterviewerProfile";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (session.role !== "interviewer" && session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const defaultIdentities = [
      { id: process.env.INTERVIEWER_1_ID || "INT1", name: process.env.INTERVIEWER_1_NAME || "Ahmed" },
      { id: process.env.INTERVIEWER_2_ID || "INT2", name: process.env.INTERVIEWER_2_NAME || "Amaan" },
      { id: process.env.INTERVIEWER_3_ID || "INT3", name: process.env.INTERVIEWER_3_NAME || "Mudabeer" },
    ];

    const identityMap = new Map<string, { id: string; name: string }>();
    for (const id of defaultIdentities) {
      identityMap.set(id.name.toLowerCase(), id);
    }

    try {
      await connectToDatabase();
      const profiles = await InterviewerProfile.find({}).sort({ name: 1 }).lean();
      for (const p of profiles) {
        const lower = p.name.toLowerCase();
        if (!identityMap.has(lower)) {
          identityMap.set(lower, { id: String(p._id), name: p.name });
        }
      }
    } catch (dbErr) {
      console.warn("Could not fetch InterviewerProfile documents for identities:", dbErr);
    }

    return NextResponse.json({
      success: true,
      identities: Array.from(identityMap.values()),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
