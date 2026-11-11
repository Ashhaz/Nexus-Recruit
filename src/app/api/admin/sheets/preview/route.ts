import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import SheetSource from "@/models/SheetSource";
import { fetchSheetRows, findHeaderKey } from "@/lib/googleSheets";

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Administrator access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, limit = 15 } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Source ID is required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const source = await SheetSource.findById(id);
    if (!source) {
      return NextResponse.json(
        { success: false, error: "Spreadsheet source not found." },
        { status: 404 }
      );
    }

    const previewLimit = Math.min(Math.max(Number(limit) || 15, 1), 50);

    const result = await fetchSheetRows({
      spreadsheetId: source.spreadsheetId,
      sheetName: source.sheetName,
      range: source.range,
      limit: previewLimit,
    });

    // Detect column mappings for feedback using the exact same word-boundary matcher as import
    const headers = result.headers || Object.keys(result.rows[0] || {});
    const detectedMappings: Record<string, string> = {
      name: findHeaderKey(headers, [["full", "name"], ["name"]]) || "Not detected",
      rollNumber: findHeaderKey(headers, [["roll", "number"], ["roll", "no"], ["roll"]]) || "Not detected",
      email: findHeaderKey(headers, [["mail"]]) || "Not detected",
      phone: findHeaderKey(headers, [["contact"], ["phone"], ["mobile"]]) || "Not detected",
      branch: findHeaderKey(headers, [["branch"], ["department"]]) || "Not detected",
      year: findHeaderKey(headers, [["year"]]) || "Not detected",
      team: findHeaderKey(headers, [["team"], ["domain"]]) || "Optional / Not detected",
    };

    return NextResponse.json({
      success: true,
      sourceName: source.name,
      title: result.title,
      sheetName: result.sheetName,
      headers: result.headers,
      rows: result.rows,
      totalRows: result.totalRows,
      previewCount: result.rows.length,
      detectedMappings,
    });
  } catch (error: any) {
    console.error("POST /api/admin/sheets/preview Error:", error);
    const isGoogle404 =
      error.status === 404 ||
      error.response?.status === 404 ||
      error.message?.includes("Requested entity was not found");
    let message = error.message || "Failed to preview spreadsheet data.";
    if (isGoogle404) {
      message = "Spreadsheet not accessible (404). Please ensure the spreadsheet exists and is shared with your configured service account as Viewer.";
    }
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

