import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getAuthSession();
    return NextResponse.json({
      success: true,
      user: {
        name: session.name,
        email: session.email,
        role: session.role,
        interviewerId: session.interviewerId,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
