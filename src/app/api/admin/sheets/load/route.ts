import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import SheetSource from "@/models/SheetSource";
import { importSheetSourceRows } from "@/lib/sheetImport";

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
    const { id } = body;

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

    if (source.isActive === false) {
      return NextResponse.json(
        { success: false, error: `Spreadsheet source "${source.name}" is currently deactivated. Please activate it first.` },
        { status: 400 }
      );
    }

    const result = await importSheetSourceRows(source);

    return NextResponse.json({
      success: true,
      sourceName: source.name,
      totalRows: result.totalRows,
      imported: result.imported,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
      applicantCount: result.applicantCount,
      skippedReasons: result.skippedDetails,
      failedReasons: result.failedDetails,
      message: `Data load complete for "${source.name}": ${result.imported} inserted, ${result.updated} updated, ${result.skipped} skipped${result.failed ? `, ${result.failed} failed` : ""}.`,
    });
  } catch (error: any) {
    console.error("POST /api/admin/sheets/load Error:", error);
    const isGoogle404 =
      error.status === 404 ||
      error.response?.status === 404 ||
      error.message?.includes("Requested entity was not found");
    let message = error.message || "Failed to load data from spreadsheet.";
    if (isGoogle404) {
      message = "Spreadsheet not accessible (404). Please ensure the spreadsheet exists and is shared with your configured service account as Viewer.";
    }
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

