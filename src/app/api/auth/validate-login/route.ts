import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import InterviewerProfile from "@/models/InterviewerProfile";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, identifier, portal } = body as {
      sessionId?: string;
      identifier?: string;
      portal: "admin" | "interviewer";
    };

    if (!portal || (portal !== "admin" && portal !== "interviewer")) {
      return NextResponse.json(
        { success: false, error: "Invalid portal specified. Must be 'admin' or 'interviewer'." },
        { status: 400 }
      );
    }

    const client = await clerkClient();
    let clerkUser: any = null;

    // 1. Resolve Clerk user via sessionId if available
    if (sessionId) {
      try {
        const sessionObj = await client.sessions.getSession(sessionId);
        if (sessionObj && sessionObj.userId) {
          clerkUser = await client.users.getUser(sessionObj.userId);
        }
      } catch (sessErr: any) {
        console.warn("[validate-login] Could not get user by sessionId:", sessErr.message);
      }
    }

    // 2. Fallback to resolving Clerk user via identifier / email
    if (!clerkUser && identifier) {
      try {
        const cleanEmail = identifier.trim().toLowerCase();
        const userList = await client.users.getUserList({
          emailAddress: [cleanEmail],
          limit: 1,
        });
        if (userList.data && userList.data.length > 0) {
          clerkUser = userList.data[0];
        }
      } catch (userErr: any) {
        console.warn("[validate-login] Could not get user by email identifier:", userErr.message);
      }
    }

    if (!clerkUser) {
      return NextResponse.json(
        { success: false, error: "Authentication validation failed: Clerk user could not be identified." },
        { status: 404 }
      );
    }

    // 3. Resolve role using authoritative server-side checks
    const primaryEmailObj = clerkUser.emailAddresses?.find(
      (e: any) => e.id === clerkUser.primaryEmailAddressId
    );
    const email = (primaryEmailObj?.emailAddress || "").toLowerCase();
    const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
    const clerkRole = (clerkUser.publicMetadata?.role as string)?.toLowerCase();

    let resolvedRole: "admin" | "interviewer" = "interviewer";

    if ((adminEmail && email === adminEmail) || clerkRole === "admin") {
      resolvedRole = "admin";
    } else {
      // Check MongoDB user records as well
      try {
        await connectToDatabase();
        const dbUser = await User.findOne({
          $or: [{ email }, { clerkId: clerkUser.id }],
        }).lean();

        if (dbUser && dbUser.role === "Admin") {
          resolvedRole = "admin";
        }
      } catch (dbErr) {
        console.warn("[validate-login] DB user role check warning:", dbErr);
      }
    }

    // 4. Role Authorization Comparison
    if (portal === "admin" && resolvedRole !== "admin") {
      // Mismatch: Interviewer trying to access Admin Portal
      if (sessionId) {
        try {
          await client.sessions.revokeSession(sessionId);
        } catch (revokeErr: any) {
          console.warn("[validate-login] Failed to revoke mismatched session:", revokeErr.message);
        }
      }

      return NextResponse.json(
        {
          success: false,
          code: "ROLE_MISMATCH",
          error: "Access Denied: Your account does not have administrator permissions. Please use an authorized admin account.",
          role: resolvedRole,
        },
        { status: 403 }
      );
    }

    if (portal === "interviewer" && resolvedRole !== "interviewer") {
      // Mismatch: Admin trying to access Interviewer Portal
      if (sessionId) {
        try {
          await client.sessions.revokeSession(sessionId);
        } catch (revokeErr: any) {
          console.warn("[validate-login] Failed to revoke mismatched session:", revokeErr.message);
        }
      }

      return NextResponse.json(
        {
          success: false,
          code: "ROLE_MISMATCH",
          error: "Access Denied: Your account does not have interviewer permissions. Please use an authorized interviewer account.",
          role: resolvedRole,
        },
        { status: 403 }
      );
    }

    // Match! Return destination URL
    const destination = portal === "admin" ? "/admin/dashboard" : "/interviewer/dashboard";
    return NextResponse.json({
      success: true,
      role: resolvedRole,
      destination,
    });
  } catch (error: any) {
    console.error("[validate-login] Internal error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

