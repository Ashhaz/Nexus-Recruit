import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";

export default async function InterviewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();

  if (session.role !== "interviewer") {
    redirect(session.role === "admin" ? "/admin/dashboard" : "/login");
  }

  return <>{children}</>;
}
