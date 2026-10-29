import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import InterviewRoom from "@/models/InterviewRoom";
import Applicant from "@/models/Applicant"; // must be imported so mongoose.models["Applicant"] is registered before .populate() resolves the ref
import { getAuthSession } from "@/lib/auth";

const DEFAULT_ROOMS = [
  {
    roomNumber: 1,
    name: "Room 01",
    assignedInterviewer: process.env.INTERVIEWER_1_NAME || "Ahmed",
    assignedInterviewerId: process.env.INTERVIEWER_1_ID || "INT1",
    isActive: true,
  },
  {
    roomNumber: 2,
    name: "Room 02",
    assignedInterviewer: process.env.INTERVIEWER_2_NAME || "Sarah",
    assignedInterviewerId: process.env.INTERVIEWER_2_ID || "INT2",
    isActive: true,
  },
  {
    roomNumber: 3,
    name: "Room 03",
    assignedInterviewer: process.env.INTERVIEWER_3_NAME || "Mudabeer",
    assignedInterviewerId: process.env.INTERVIEWER_3_ID || "INT3",
    isActive: true,
  },
];

// Auto-seed rooms 1-3 if missing, and ensure default assigned interviewers are set
async function seedRooms() {
  const existing = await InterviewRoom.find({ roomNumber: { $in: [1, 2, 3] } }).lean();
  const existingMap = new Map(existing.map((r) => [r.roomNumber, r]));

  for (const def of DEFAULT_ROOMS) {
    const found = existingMap.get(def.roomNumber);
    if (!found) {
      await InterviewRoom.create(def);
    } else if (!found.assignedInterviewer || !found.name) {
      // Ensure missing metadata on existing default rooms is populated without disrupting active data
      await InterviewRoom.updateOne(
        { roomNumber: def.roomNumber },
        {
          $set: {
            name: found.name || def.name,
            assignedInterviewer: found.assignedInterviewer || def.assignedInterviewer,
            assignedInterviewerId: found.assignedInterviewerId || def.assignedInterviewerId,
            isActive: found.isActive !== undefined ? found.isActive : true,
          },
        }
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

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only administrators can create rooms." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { roomNumber, name, assignedInterviewer } = body;

    const num = Number(roomNumber);
    if (!num || isNaN(num) || num <= 0) {
      return NextResponse.json(
        { success: false, error: "A valid positive room number is required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existingRoom = await InterviewRoom.findOne({ roomNumber: num });
    if (existingRoom) {
      return NextResponse.json(
        { success: false, error: `Room ${num} already exists.` },
        { status: 400 }
      );
    }

    const roomName = name?.trim() || `Room ${String(num).padStart(2, "0")}`;
    const interviewer = assignedInterviewer?.trim() || "";

    const newRoom = await InterviewRoom.create({
      roomNumber: num,
      name: roomName,
      assignedInterviewer: interviewer,
      status: "Available",
      isActive: true,
      applicant: null,
      interviewer: "",
      interviewerId: "",
      accumulatedTime: 0,
      startedAt: null,
      pausedAt: null,
    });

    return NextResponse.json({ success: true, room: newRoom }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/rooms Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create room." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getAuthSession();
    if (session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only administrators can update rooms." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { roomNumber, name, assignedInterviewer, isActive } = body;

    const num = Number(roomNumber);
    if (!num || isNaN(num)) {
      return NextResponse.json(
        { success: false, error: "A valid room number is required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const room = await InterviewRoom.findOne({ roomNumber: num });
    if (!room) {
      return NextResponse.json(
        { success: false, error: `Room ${num} not found.` },
        { status: 404 }
      );
    }

    // Safety check: Prevent deactivating a room while an interview is in progress
    if (isActive === false && room.status === "Occupied" && room.applicant !== null) {
      return NextResponse.json(
        { success: false, error: `Cannot deactivate Room ${num} while an interview session is actively in progress.` },
        { status: 400 }
      );
    }

    if (name !== undefined) {
      room.name = name.trim() || `Room ${String(num).padStart(2, "0")}`;
    }
    if (assignedInterviewer !== undefined) {
      room.assignedInterviewer = assignedInterviewer.trim();
    }
    if (isActive !== undefined) {
      room.isActive = Boolean(isActive);
    }

    await room.save();

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    console.error("PATCH /api/rooms Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update room." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getAuthSession();
    if (session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only administrators can remove rooms." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const roomParam = searchParams.get("roomNumber");
    const num = Number(roomParam);

    if (!num || isNaN(num)) {
      return NextResponse.json(
        { success: false, error: "A valid room number is required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const room = await InterviewRoom.findOne({ roomNumber: num });
    if (!room) {
      return NextResponse.json(
        { success: false, error: `Room ${num} not found.` },
        { status: 404 }
      );
    }

    // Safety checks: Cannot delete if occupied or if an interview is actively assigned
    if (room.status === "Occupied" || room.applicant !== null) {
      return NextResponse.json(
        { success: false, error: `Cannot delete Room ${num}: an interview session is currently active.` },
        { status: 400 }
      );
    }

    const activeApplicant = await Applicant.findOne({
      assignedRoom: num,
      interviewStatus: "Interviewing",
    });

    if (activeApplicant) {
      return NextResponse.json(
        { success: false, error: `Cannot delete Room ${num}: candidate ${activeApplicant.name} is currently interviewing in this room.` },
        { status: 400 }
      );
    }

    await InterviewRoom.deleteOne({ roomNumber: num });

    return NextResponse.json({
      success: true,
      message: `Room ${num} deleted successfully.`,
    });
  } catch (error: any) {
    console.error("DELETE /api/rooms Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete room." },
      { status: 500 }
    );
  }
}
