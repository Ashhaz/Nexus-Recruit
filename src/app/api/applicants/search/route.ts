import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Applicant from "@/models/Applicant";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ applicants: [] });
    }

    await connectToDatabase();

    const regex = new RegExp(query, "i"); // Case-insensitive partial match
    
    // Search by name or rollNumber
    const applicants = await Applicant.find({
      $or: [
        { name: { $regex: regex } },
        { rollNumber: { $regex: regex } }
      ]
    }).limit(10).lean();

    return NextResponse.json({ applicants });

  } catch (error: any) {
    console.error("Applicant Search API Error:", error);
    return NextResponse.json(
      { error: "Failed to search applicants" },
      { status: 500 }
    );
  }
}
