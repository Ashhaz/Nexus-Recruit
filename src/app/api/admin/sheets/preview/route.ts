import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import SheetSource from "@/models/SheetSource";
import { fetchSheetRows, extractField } from "@/lib/googleSheets";

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

    // Detect column mappings for feedback
    const sampleRow = result.rows[0] || {};
    const detectedMappings: Record<string, string> = {
      name: Object.keys(sampleRow).find((k) => k.toLowerCase().includes("name")) || "Not detected",
      rollNumber: Object.keys(sampleRow).find((k) => k.toLowerCase().includes("roll")) || "Not detected",
      email: Object.keys(sampleRow).find((k) => k.toLowerCase().includes("mail")) || "Not detected",
      phone: Object.keys(sampleRow).find((k) => k.toLowerCase().includes("contact") || k.toLowerCase().includes("phone")) || "Not detected",
      branch: Object.keys(sampleRow).find((k) => k.toLowerCase().includes("branch")) || "Not detected",
      year: Object.keys(sampleRow).find((k) => k.toLowerCase().includes("year")) || "Not detected",
      team: Object.keys(sampleRow).find((k) => k.toLowerCase().includes("team") || k.toLowerCase().includes("domain")) || "Optional / Not detected",
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
    return NextResponse.json(
      { success: false, error: error.message || "Failed to preview spreadsheet data." },
      { status: 500 }
    );
  }
}

