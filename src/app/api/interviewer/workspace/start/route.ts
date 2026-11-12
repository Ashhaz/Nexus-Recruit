import { NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import InterviewRoom from "@/models/InterviewRoom";
import InterviewSession from "@/models/InterviewSession";
import Applicant from "@/models/Applicant";
import { getActiveEventId } from "@/lib/activeEvent";
import { getAuthSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (session.role !== "interviewer") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Interviewer access required." },
        { status: 403 }
      );
    }

    const { roomNumber, applicantId, interviewerId, interviewerName } = await request.json();

    if (!roomNumber || !applicantId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: roomNumber or applicantId." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const activeEventId = await getActiveEventId();

    const room = await InterviewRoom.findOne({ roomNumber: Number(roomNumber) });
    if (!room) {
      return NextResponse.json(
        { success: false, error: "THIS ROOM IS NO LONGER AVAILABLE" },
        { status: 404 }
      );
    }

    if (room.isActive === false) {
      return NextResponse.json(
        { success: false, error: "THIS ROOM IS CURRENTLY DEACTIVATED" },
        { status: 400 }
      );
    }

    // Reject the start request if the room already has an active applicant
    if (room.applicant !== null) {
      return NextResponse.json(
        { success: false, error: "THIS ROOM ALREADY HAS AN ACTIVE INTERVIEW" },
        { status: 409 }
      );
    }

    // Server-side active event enforcement
    const candidate = await Applicant.findById(applicantId);
    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "CANDIDATE NOT FOUND" },
        { status: 404 }
      );
    }

    if (activeEventId && candidate.eventId !== activeEventId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED: This candidate does not belong to the currently active recruitment event."
        },
        { status: 403 }
      );
    }

    // Require authenticated Clerk user identity
    if (!session.clerkUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing authenticated Clerk user identity." },
        { status: 403 }
      );
    }

    // Generate unique durable interview session ID
    const interviewSessionId = crypto.randomUUID();
    const eventId = (candidate.eventId || activeEventId || "").trim();
    if (!eventId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED: Unable to establish recruitment event association. A valid event ID is required to start an interview session.",
        },
        { status: 400 }
      );
    }
    const storedClerkUserId = session.clerkUserId;
    const storedInterviewerId = session.interviewerId || "";
    const effectiveInterviewerName = session.interviewerName || session.name || "Interviewer";
    const startTime = new Date();

    // Atomic session creation with MongoDB transaction
    const mongoSession = await mongoose.startSession();
    try {
      mongoSession.startTransaction();

      // 1. Atomically assign the candidate only if they are Waiting and assignedRoom is null
      const updateCondition: any = {
        _id: applicantId,
        interviewStatus: "Waiting",
        $or: [
          { assignedRoom: null },
          { assignedRoom: { $exists: false } }
        ]
      };
      if (activeEventId) {
        updateCondition.eventId = activeEventId;
      }

      const updateResult = await Applicant.updateOne(
        updateCondition,
        {
          $set: {
            interviewStatus: "Interviewing",
            assignedInterviewer: effectiveInterviewerName,
            assignedRoom: room.roomNumber
          }
        },
        { session: mongoSession }
      );

      if (updateResult.matchedCount === 0) {
        await mongoSession.abortTransaction();
        return NextResponse.json(
          { success: false, error: "CANDIDATE IS NO LONGER AVAILABLE" },
          { status: 409 }
        );
      }

      // 2. Atomically occupy the room only if applicant is null
      const roomUpdateResult = await InterviewRoom.updateOne(
        {
          roomNumber: Number(roomNumber),
          isActive: { $ne: false },
          applicant: null,
        },
        {
          $set: {
            applicant: candidate._id,
            status: "Occupied",
            interviewerId: storedInterviewerId,
            interviewer: effectiveInterviewerName,
            interviewSessionId,
            eventId,
            startedAt: startTime,
            pausedAt: null,
            accumulatedTime: 0,
          }
        },
        { session: mongoSession }
      );

      if (roomUpdateResult.matchedCount === 0) {
        await mongoSession.abortTransaction();
        return NextResponse.json(
          { success: false, error: "THIS ROOM ALREADY HAS AN ACTIVE INTERVIEW" },
          { status: 409 }
        );
      }

      // 3. Create durable session in MongoDB
      await InterviewSession.create(
        [
          {
            sessionId: interviewSessionId,
            applicantId: candidate._id,
            roomNumber: room.roomNumber,
            eventId,
            interviewerId: storedInterviewerId,
            interviewerName: effectiveInterviewerName,
            clerkUserId: storedClerkUserId,
            status: "active",
            startedAt: startTime,
          }
        ],
        { session: mongoSession }
      );

      await mongoSession.commitTransaction();
    } catch (txErr: any) {
      if (mongoSession.inTransaction()) {
        await mongoSession.abortTransaction();
      }
      throw txErr;
    } finally {
      await mongoSession.endSession();
    }

    const updatedRoom = await InterviewRoom.findOne({ roomNumber: Number(roomNumber) });

    return NextResponse.json({ success: true, room: updatedRoom, interviewSessionId });
  } catch (error: any) {
    console.error("POST /api/interviewer/workspace/start Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
