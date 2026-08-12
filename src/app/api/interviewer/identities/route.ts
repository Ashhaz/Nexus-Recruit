import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (session.role !== "interviewer" && session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const identities = [
      { id: process.env.INTERVIEWER_1_ID || "INT1", name: process.env.INTERVIEWER_1_NAME || "Ahmed" },
      { id: process.env.INTERVIEWER_2_ID || "INT2", name: process.env.INTERVIEWER_2_NAME || "Sarah" },
      { id: process.env.INTERVIEWER_3_ID || "INT3", name: process.env.INTERVIEWER_3_NAME || "Mudabeer" },
    ];

    return NextResponse.json({
      success: true,
      identities,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
