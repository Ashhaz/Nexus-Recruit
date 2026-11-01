import { currentUser } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import InterviewerProfile from "@/models/InterviewerProfile";
import InterviewRoom from "@/models/InterviewRoom";

export type UserRole = "admin" | "interviewer" | "unauthorized";

export interface AuthSession {
  role: UserRole;
  email: string | null;
  name: string | null;
  interviewerId: string | null;
  interviewerName: string | null;
  clerkUserId: string | null;
  assignedRoomNumber: number | null;
}

export async function getAuthSession(): Promise<AuthSession> {
  const user = await currentUser();
  if (!user) {
    return {
      role: "unauthorized",
      email: null,
      name: null,
      interviewerId: null,
      interviewerName: null,
      clerkUserId: null,
      assignedRoomNumber: null,
    };
  }

  const primaryEmailObj = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
  const email = (primaryEmailObj?.emailAddress || "").toLowerCase();
  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();

  const clerkRole = (user.publicMetadata?.role as string)?.toLowerCase();

  // If email matches ADMIN_EMAIL or Clerk publicMetadata specifies admin
  if ((adminEmail && email === adminEmail) || clerkRole === "admin") {
    const adminName =
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.firstName ||
      "Administrator";
    return {
      role: "admin",
      email,
      name: adminName,
      interviewerId: null,
      interviewerName: adminName,
      clerkUserId: user.id,
      assignedRoomNumber: null,
    };
  }

  // Otherwise, user is treated as an interviewer
  let resolvedName =
    (user.publicMetadata?.interviewerName as string) ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.firstName ||
    "Interviewer";
  let resolvedId: string | null = (user.publicMetadata?.interviewerId as string) || user.id;
  let assignedRoomNumber: number | null = null;

  try {
    await connectToDatabase();

    // 1. Look up interviewer profile by clerkUserId, email, or name
    const profile = await InterviewerProfile.findOne({
      $or: [
        { clerkUserId: user.id },
        { email: email },
        { name: { $regex: new RegExp(`^${resolvedName}$`, "i") } },
      ],
      isArchived: { $ne: true },
    }).lean();

    if (profile) {
      resolvedName = profile.name || resolvedName;
      resolvedId = profile.interviewerId || profile.clerkUserId || String(profile._id);
    } else {
      // Also check User model fallback
      const dbUser = await User.findOne({
        $or: [{ email: email }, { clerkId: user.id }],
      }).lean();

      if (dbUser) {
        resolvedName = dbUser.name || resolvedName;
        resolvedId = String(dbUser._id);
      }
    }

    // 2. Find assigned room for this interviewer
    const room = await InterviewRoom.findOne({
      $or: [
        { assignedInterviewerId: resolvedId },
        { assignedInterviewer: { $regex: new RegExp(`^${resolvedName}$`, "i") } },
      ],
      isActive: { $ne: false },
    }).lean();

    if (room) {
      assignedRoomNumber = room.roomNumber;
    }
  } catch (err) {
    console.warn("Could not load database User profile for session:", err);
  }

  return {
    role: "interviewer",
    email,
    name: resolvedName,
    interviewerId: resolvedId,
    interviewerName: resolvedName,
    clerkUserId: user.id,
    assignedRoomNumber,
  };
}
