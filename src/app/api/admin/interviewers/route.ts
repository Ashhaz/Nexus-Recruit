import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import InterviewerProfile from "@/models/InterviewerProfile";
import InterviewRoom from "@/models/InterviewRoom";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Administrator access required." },
        { status: 403 }
      );
    }

    await connectToDatabase();

    // Default system interviewer identities
    const defaultIdentities = [
      { id: process.env.INTERVIEWER_1_ID || "INT1", name: process.env.INTERVIEWER_1_NAME || "Ahmed", isDefault: true },
      { id: process.env.INTERVIEWER_2_ID || "INT2", name: process.env.INTERVIEWER_2_NAME || "Amaan", isDefault: true },
      { id: process.env.INTERVIEWER_3_ID || "INT3", name: process.env.INTERVIEWER_3_NAME || "Mudabeer", isDefault: true },
    ];

    // Custom profiles from MongoDB
    const customProfiles = await InterviewerProfile.find({})
      .sort({ createdAt: -1 })
      .lean();

    const rooms = await InterviewRoom.find({}).lean();

    const interviewerMap = new Map<string, any>();

    // Add defaults first
    for (const def of defaultIdentities) {
      const assigned = rooms.find(
        (r) => r.assignedInterviewer?.toLowerCase() === def.name.toLowerCase()
      );
      interviewerMap.set(def.name.toLowerCase(), {
        id: def.id,
        name: def.name,
        role: "Default Interviewer",
        isDefault: true,
        assignedToRoom: assigned ? assigned.roomNumber : null,
        assignedRoomName: assigned ? (assigned.name || `Room ${assigned.roomNumber}`) : null,
      });
    }

    // Add custom profiles
    for (const prof of customProfiles) {
      const lower = prof.name.toLowerCase();
      if (!interviewerMap.has(lower)) {
        const assigned = rooms.find(
          (r) => r.assignedInterviewer?.toLowerCase() === lower
        );
        interviewerMap.set(lower, {
          id: String(prof._id),
          name: prof.name,
          role: "Custom Profile",
          isDefault: false,
          assignedToRoom: assigned ? assigned.roomNumber : null,
          assignedRoomName: assigned ? (assigned.name || `Room ${assigned.roomNumber}`) : null,
          createdAt: prof.createdAt,
        });
      }
    }

    return NextResponse.json({
      success: true,
      interviewers: Array.from(interviewerMap.values()),
    });
  } catch (error: any) {
    console.error("GET /api/admin/interviewers Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch interviewers." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Administrator access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name } = body;

    const trimmedName = name?.trim();
    if (!trimmedName) {
      return NextResponse.json(
        { success: false, error: "Interviewer Full Name is required." },
        { status: 400 }
      );
    }

    // Check against default interviewer names
    const defaultNames = [
      (process.env.INTERVIEWER_1_NAME || "Ahmed").trim().toLowerCase(),
      (process.env.INTERVIEWER_2_NAME || "Amaan").trim().toLowerCase(),
      (process.env.INTERVIEWER_3_NAME || "Mudabeer").trim().toLowerCase(),
    ];

    if (defaultNames.includes(trimmedName.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: `An interviewer named "${trimmedName}" already exists as a default interviewer.` },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check duplicate in InterviewerProfile (case-insensitive)
    const existing = await InterviewerProfile.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `An interviewer named "${trimmedName}" already exists.` },
        { status: 400 }
      );
    }

    // Create the interviewer profile in MongoDB
    const newProfile = await InterviewerProfile.create({
      name: trimmedName,
    });

    return NextResponse.json(
      {
        success: true,
        interviewer: {
          id: String(newProfile._id),
          name: newProfile.name,
          role: "Custom Profile",
          isDefault: false,
          createdAt: newProfile.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/admin/interviewers Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create interviewer profile." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getAuthSession();
    if (session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Administrator access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Interviewer id query param is required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const profile = await InterviewerProfile.findById(id);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Interviewer profile not found." },
        { status: 404 }
      );
    }

    // Safety check: Cannot delete if currently assigned to any room
    const assignedRoom = await InterviewRoom.findOne({
      assignedInterviewer: { $regex: new RegExp(`^${profile.name}$`, "i") },
    });

    if (assignedRoom) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete "${profile.name}" because they are currently assigned to Room ${assignedRoom.roomNumber}. Unassign them from the room first.`,
        },
        { status: 400 }
      );
    }

    await InterviewerProfile.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: `Interviewer "${profile.name}" removed successfully.`,
    });
  } catch (error: any) {
    console.error("DELETE /api/admin/interviewers Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete interviewer profile." },
      { status: 500 }
    );
  }
}
