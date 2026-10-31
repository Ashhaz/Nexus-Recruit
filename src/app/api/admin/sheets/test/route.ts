import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import SheetSource from "@/models/SheetSource";
import {
  extractSpreadsheetId,
  getSpreadsheetMetadata,
  getServiceAccountEmail,
  fetchSheetRows,
} from "@/lib/googleSheets";

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
    const { id, url, sheetName } = body;

    await connectToDatabase();

    let targetSpreadsheetId = "";
    let sourceDoc: any = null;

    if (id) {
      sourceDoc = await SheetSource.findById(id);
      if (!sourceDoc) {
        return NextResponse.json(
          { success: false, error: "Spreadsheet source not found." },
          { status: 404 }
        );
      }
      targetSpreadsheetId = sourceDoc.spreadsheetId;
    } else if (url) {
      targetSpreadsheetId = extractSpreadsheetId(url);
    }

    if (!targetSpreadsheetId) {
      return NextResponse.json(
        { success: false, error: "Source ID or Google Sheet URL/ID is required." },
        { status: 400 }
      );
    }

    const serviceAccountEmail = getServiceAccountEmail();

    try {
      const metadata = await getSpreadsheetMetadata(targetSpreadsheetId);
      const targetSheet = sheetName || sourceDoc?.sheetName || metadata.sheets[0];

      // Quick row count test
      const sample = await fetchSheetRows({
        spreadsheetId: targetSpreadsheetId,
        sheetName: targetSheet,
        limit: 1,
      });

      if (sourceDoc) {
        sourceDoc.status = "Connected";
        sourceDoc.lastError = null;
        sourceDoc.lastTestedAt = new Date();
        await sourceDoc.save();
      }

      return NextResponse.json({
        success: true,
        title: metadata.title,
        sheets: metadata.sheets,
        activeWorksheet: sample.sheetName,
        totalDataRows: sample.totalRows,
        columnCount: sample.headers.length,
        serviceAccountEmail,
      });
    } catch (testErr: any) {
      const rawError = testErr.message || "Failed to connect to Google Sheets";
      let userFriendlyError = rawError;

      if (rawError.includes("403") || rawError.includes("permission") || rawError.includes("caller does not have permission")) {
        userFriendlyError = `Access denied (403): Please share this Google Sheet with your service account email: "${serviceAccountEmail}" as a Viewer.`;
      } else if (rawError.includes("404") || rawError.includes("not found")) {
        userFriendlyError = `Spreadsheet not found (404): Please check that the URL or ID "${targetSpreadsheetId}" is correct and the file has not been deleted.`;
      }

      if (sourceDoc) {
        sourceDoc.status = "Error";
        sourceDoc.lastError = userFriendlyError;
        sourceDoc.lastTestedAt = new Date();
        await sourceDoc.save();
      }

      return NextResponse.json(
        {
          success: false,
          error: userFriendlyError,
          rawError,
          serviceAccountEmail,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("POST /api/admin/sheets/test Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

