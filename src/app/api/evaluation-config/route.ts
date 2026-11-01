import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import {
  getGlobalEvaluationConfig,
  saveGlobalEvaluationConfig,
} from "@/lib/evaluationConfig";

/**
 * GET /api/evaluation-config
 * Returns the single global evaluation configuration.
 * Accessible to authenticated users (admin & interviewers).
 */
export async function GET() {
  try {
    const session = await getAuthSession();
    if (session.role === "unauthorized") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please sign in." },
        { status: 401 }
      );
    }

    const config = await getGlobalEvaluationConfig();
    return NextResponse.json({
      success: true,
      criteria: config.criteria,
    });
  } catch (error: any) {
    console.error("GET /api/evaluation-config Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch evaluation configuration." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/evaluation-config
 * Updates the single global evaluation criteria configuration.
 * Restricted to administrators only.
 */
export async function PUT(request: Request) {
  try {
    const session = await getAuthSession();
    if (session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Administrator access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { criteria } = body as { criteria: Array<{ id?: string; name: string; maxScore?: number }> };

    if (!Array.isArray(criteria) || criteria.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one evaluation criterion is required." },
        { status: 400 }
      );
    }

    const updated = await saveGlobalEvaluationConfig(criteria);
    return NextResponse.json({
      success: true,
      criteria: updated.criteria,
    });
  } catch (error: any) {
    console.error("PUT /api/evaluation-config Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update evaluation configuration." },
      { status: 400 }
    );
  }
}

/**
 * Also support POST for clients that prefer POST.
 */
export async function POST(request: Request) {
  return PUT(request);
}

