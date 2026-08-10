import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();

  if (session.role !== "admin") {
    redirect(session.role === "interviewer" ? "/interviewer/dashboard" : "/login");
  }

  return <>{children}</>;
}
