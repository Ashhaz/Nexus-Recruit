import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getActiveEventId, getActiveEventSource, setActiveEventId } from "@/lib/activeEvent";

export async function GET() {
  try {
    const activeEventId = await getActiveEventId();
    const event = await getActiveEventSource();

    return NextResponse.json({
      success: true,
      activeEventId,
      event,
    });
  } catch (error: any) {
    console.error("GET /api/admin/sheets/active Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve active event." },
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
    const { eventId } = body;

    if (!eventId || typeof eventId !== "string") {
      return NextResponse.json(
        { success: false, error: "eventId is required." },
        { status: 400 }
      );
    }

    const updatedSource = await setActiveEventId(eventId);

    return NextResponse.json({
      success: true,
      message: `"${updatedSource.name}" is now the global active recruitment event.`,
      activeEventId: String(updatedSource._id),
      event: updatedSource,
    });
  } catch (error: any) {
    console.error("POST /api/admin/sheets/active Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to set active event." },
      { status: 500 }
    );
  }
}

