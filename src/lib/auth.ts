import { currentUser } from "@clerk/nextjs/server";

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
  return {
    role: "interviewer",
    email,
    name: user.firstName || "Shared Interviewer",
    interviewerId: null
  };
}
