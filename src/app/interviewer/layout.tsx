import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { headers } from "next/headers";
import connectToDatabase from "@/lib/mongodb";
import InterviewRoom from "@/models/InterviewRoom";

export default async function InterviewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();

  if (session.role !== "interviewer" && session.role !== "admin") {
    redirect("/login");
  }

  if (session.role === "admin") {
    const headersList = await headers();
    const roomNumberStr = headersList.get("x-room-number");
    const pathname = headersList.get("x-pathname") || "";

    if (!roomNumberStr) {
      redirect("/admin/dashboard");
    }

    const roomNumber = Number(roomNumberStr);
    await connectToDatabase();
    const room = await InterviewRoom.findOne({ roomNumber }).lean();

    if (!room) {
      redirect("/admin/dashboard");
    }

    // 1. Physical room must be registered to an interviewer
    if (!room.interviewerId || !room.interviewer) {
      redirect("/admin/dashboard");
    }

    // 2. Cannot take over an active interview
    if (pathname.includes("/workspace/select") && room.applicant !== null) {
      redirect("/admin/dashboard");
    }
  }

  return <>{children}</>;
}
