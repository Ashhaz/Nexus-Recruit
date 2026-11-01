import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RootPage() {
  const session = await getAuthSession();

  if (session.role === "admin") {
    redirect("/admin/dashboard");
  }

  if (session.role === "interviewer") {
    redirect("/interviewer/dashboard");
  }

  // Unauthenticated — send to login
  redirect("/login");
}
