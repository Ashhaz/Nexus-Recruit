import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import InterviewRoom from "@/models/InterviewRoom";
import Applicant from "@/models/Applicant"; // must be imported so mongoose.models["Applicant"] is registered before .populate() resolves the ref

// Auto-seed rooms 1-3 if they do not exist yet.
async function seedRooms() {
  const count = await InterviewRoom.countDocuments();
  if (count < 3) {
    const existing = await InterviewRoom.find().select("roomNumber").lean();
    const existingNumbers = new Set(existing.map((r) => r.roomNumber));
    const toCreate = [1, 2, 3].filter((n) => !existingNumbers.has(n));
    if (toCreate.length > 0) {
      await InterviewRoom.insertMany(
        toCreate.map((n) => ({ roomNumber: n }))
      );
    }
  }
}

export async function GET() {
  try {
    await connectToDatabase();
    await seedRooms();

    const rooms = await InterviewRoom.find()
      .sort({ roomNumber: 1 })
      .populate({
        path: "applicant",
        model: Applicant,
        select: "name rollNumber",
      })
      .lean();

    return NextResponse.json({ success: true, rooms });
  } catch (error: any) {
    console.error("GET /api/rooms Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}
