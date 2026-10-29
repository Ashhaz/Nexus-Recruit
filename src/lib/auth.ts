import { currentUser } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

export type UserRole = "admin" | "interviewer" | "unauthorized";

export interface AuthSession {
  role: UserRole;
  email: string | null;
  name: string | null;
  interviewerId: string | null;
}

export async function getAuthSession(): Promise<AuthSession> {
  const user = await currentUser();
  if (!user) {
    return { role: "unauthorized", email: null, name: null, interviewerId: null };
  }

  const primaryEmailObj = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
  const email = primaryEmailObj?.emailAddress || "";

  if (email === process.env.ADMIN_EMAIL) {
    return { role: "admin", email, name: "Admin", interviewerId: null };
  }

  // Any authenticated Clerk user who is not the admin has role "interviewer"
  let resolvedName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.firstName ||
    "Interviewer";
  let resolvedId: string | null = user.id;

  try {
    await connectToDatabase();
    const dbUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { clerkId: user.id }],
    }).lean();

    if (dbUser) {
      resolvedName = dbUser.name || resolvedName;
      resolvedId = String(dbUser._id);
    }
  } catch (err) {
    console.warn("Could not load database User profile for session:", err);
  }

  return {
    role: "interviewer",
    email,
    name: resolvedName,
    interviewerId: resolvedId,
  };
}
