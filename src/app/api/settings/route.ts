import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Applicant from "@/models/Applicant";
import mongoose from "mongoose";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (session.role === "unauthorized") {
      return NextResponse.json({ success: false, error: "Unauthorized: Please sign in." }, { status: 401 });
    }
    if (session.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden: Administrator access required." }, { status: 403 });
    }

    // ── 1. MongoDB health check ───────────────────────────────────────────────
  let mongodbConnected = false;
  let totalApplicants = 0;
  let lastSync: string | null = null;

  try {
    await connectToDatabase();
    mongodbConnected = mongoose.connection.readyState === 1;

    if (mongodbConnected) {
      totalApplicants = await Applicant.countDocuments();

      // Last sync ≈ the updatedAt of the most-recently-modified applicant
      const latest = await Applicant.findOne()
        .sort({ updatedAt: -1 })
        .select("updatedAt")
        .lean();
      if (latest) lastSync = (latest as any).updatedAt?.toISOString() ?? null;
    }
  } catch {
    mongodbConnected = false;
  }

  // ── 2. Google Sheets health check ────────────────────────────────────────
  // We consider it "connected" when both env vars are present and non-empty.
  const googleSheetsConnected =
    !!(process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_APPLICATION_CREDENTIALS);

  // ── 3. Runtime metadata ──────────────────────────────────────────────────
  const nodeVersion = process.version; // e.g. "v20.11.0"
  const environment =
    process.env.NODE_ENV === "production" ? "Production" : "Development";

    return NextResponse.json({
      success: true,
      data: {
        mongodbConnected,
        googleSheetsConnected,
        lastSync,
        totalApplicants,
        environment,
        version: "1.0.0",
        nodeVersion,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
