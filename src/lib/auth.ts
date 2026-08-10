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

  if (email === process.env.INTERVIEWER_1_ID) {
    return { role: "interviewer", email, name: process.env.INTERVIEWER_1_NAME || "Interviewer 1", interviewerId: "INT1" };
  }

  if (email === process.env.INTERVIEWER_2_ID) {
    return { role: "interviewer", email, name: process.env.INTERVIEWER_2_NAME || "Interviewer 2", interviewerId: "INT2" };
  }

  if (email === process.env.INTERVIEWER_3_ID) {
    return { role: "interviewer", email, name: process.env.INTERVIEWER_3_NAME || "Interviewer 3", interviewerId: "INT3" };
  }

  return { role: "unauthorized", email, name: user.firstName || "Unknown", interviewerId: null };
}
