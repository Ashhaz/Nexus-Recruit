import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Applicant from "@/models/Applicant";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    await connectToDatabase();

    const queryCondition: any = {
      interviewStatus: "Waiting",
      $or: [
        { assignedRoom: null },
        { assignedRoom: { $exists: false } }
      ]
    };

    if (query && query.trim().length > 0) {
      const regex = new RegExp(query.trim(), "i");
      queryCondition.$and = [
        {
          $or: [
            { name: { $regex: regex } },
            { rollNumber: { $regex: regex } }
          ]
        }
      ];
    }

    const applicants = await Applicant.find(queryCondition)
      .select("_id name rollNumber department year")
      .limit(30)
      .lean();

    return NextResponse.json({ applicants });
  } catch (error: any) {
    console.error("Applicant Search API Error:", error);
    return NextResponse.json(
      { error: "Failed to search applicants" },
      { status: 500 }
    );
  }
}
