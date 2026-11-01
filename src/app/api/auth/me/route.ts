import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getAuthSession();
    const res = NextResponse.json({
      success: true,
      user: {
        name: session.name,
        email: session.email,
        role: session.role,
        interviewerId: session.interviewerId,
        interviewerName: session.interviewerName,
        clerkUserId: session.clerkUserId,
        assignedRoomNumber: session.assignedRoomNumber,
      },
    });

    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
