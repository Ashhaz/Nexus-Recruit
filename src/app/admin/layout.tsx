import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import AdminLayoutClient from "@/components/admin/AdminLayoutClient";
import AccessDenied from "@/components/auth/AccessDenied";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();

  if (session.role === "unauthorized") {
    redirect("/login?portal=admin");
  }

  if (session.role !== "admin") {
    return (
      <AccessDenied
        requiredPortal="Admin"
        userRole={session.role}
        authorizedDashboard="/interviewer/dashboard"
        message="This account is registered as an Interviewer and cannot access the Admin Portal."
      />
    );
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
