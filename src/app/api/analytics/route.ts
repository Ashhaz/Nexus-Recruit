import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Applicant from "@/models/Applicant";

export async function GET() {
  try {
    await connectToDatabase();

    // 1 ── Overview counts ───────────────────────────────────────────────────
    const [total, waiting, interviewing, approved, pending, discussionNeeded] =
      await Promise.all([
        Applicant.countDocuments(),
        Applicant.countDocuments({ interviewStatus: "Waiting" }),
        Applicant.countDocuments({ interviewStatus: "Interviewing" }),
        Applicant.countDocuments({ interviewStatus: "Approved" }),
        Applicant.countDocuments({ interviewStatus: "Pending" }),
        Applicant.countDocuments({ interviewStatus: "Discussion Needed" }),
      ]);

    // 2 ── Department breakdown ───────────────────────────────────────────────
    const departmentAgg = await Applicant.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$department", "Unknown"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $project: { _id: 0, name: "$_id", count: 1 } },
    ]);

    // 3 ── Status distribution ────────────────────────────────────────────────
    const statusAgg = await Applicant.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$interviewStatus", "Waiting"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ]);

    // 4 ── Team breakdown ─────────────────────────────────────────────────────
    const teamAgg = await Applicant.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$teamApplied", "Unknown"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $project: { _id: 0, name: "$_id", count: 1 } },
    ]);

    // 5 ── Recent activity (latest 10) ────────────────────────────────────────
    const recent = await Applicant.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("name department interviewStatus createdAt rollNumber")
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total,
          waiting,
          interviewing,
          approved,
          pending,
          discussionNeeded,
        },
        departments: departmentAgg,
        status: statusAgg,
        teams: teamAgg,
        recent,
      },
    });
  } catch (error: any) {
    console.error("GET /api/analytics Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
