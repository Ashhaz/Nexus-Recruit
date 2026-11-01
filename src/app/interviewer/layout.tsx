import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import AccessDenied from "@/components/auth/AccessDenied";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InterviewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();

  if (session.role === "unauthorized") {
    redirect("/login?portal=interviewer");
  }

  if (session.role !== "interviewer") {
    return (
      <AccessDenied
        requiredPortal="Interviewer"
        userRole={session.role}
        authorizedDashboard="/admin/dashboard"
        message="This account is registered as an Administrator and cannot access the Interviewer Portal."
      />
    );
  }

  return <>{children}</>;
}
