import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import SheetSource from "@/models/SheetSource";
import {
  extractSpreadsheetId,
  maskSpreadsheetId,
  getSpreadsheetMetadata,
  getServiceAccountEmail,
  getServiceAccountProjectId,
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
    let rawInput = "";
    let sourceDoc: any = null;

    if (id) {
      sourceDoc = await SheetSource.findById(id);
      if (!sourceDoc) {
        return NextResponse.json(
          { success: false, error: "Spreadsheet source not found." },
          { status: 404 }
        );
      }
      rawInput = sourceDoc.spreadsheetId || sourceDoc.url || "";
      targetSpreadsheetId = extractSpreadsheetId(rawInput);
    } else if (url) {
      rawInput = String(url).trim();
      targetSpreadsheetId = extractSpreadsheetId(rawInput);
    }

    if (!targetSpreadsheetId) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid Google Sheets URL or Spreadsheet ID is required.",
          providedInput: rawInput,
        },
        { status: 400 }
      );
    }

    let serviceAccountEmail = "";
    let projectId = "";
    try {
      serviceAccountEmail = getServiceAccountEmail();
      projectId = getServiceAccountProjectId();
    } catch (e: any) {
      console.warn("Could not read service account credentials metadata:", e.message);
    }

    const maskedSpreadsheetId = maskSpreadsheetId(targetSpreadsheetId);

    try {
      // 1. First retrieve metadata to verify spreadsheet exists and is accessible
      const metadata = await getSpreadsheetMetadata(targetSpreadsheetId);
      const targetSheet = sheetName || sourceDoc?.sheetName || metadata.sheets[0];

      // 2. Perform a test row fetch
      const sample = await fetchSheetRows({
        spreadsheetId: targetSpreadsheetId,
        sheetName: targetSheet,
        limit: 1,
      });

      if (sourceDoc) {
        sourceDoc.status = "Connected";
        sourceDoc.lastError = null;
        sourceDoc.lastTestedAt = new Date();
        // If stored spreadsheetId was not normalized, update it to clean ID
        if (sourceDoc.spreadsheetId !== targetSpreadsheetId) {
          sourceDoc.spreadsheetId = targetSpreadsheetId;
        }
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
        projectId,
        maskedSpreadsheetId,
        spreadsheetId: targetSpreadsheetId,
      });
    } catch (testErr: any) {
      const httpStatus =
        testErr.status ||
        testErr.code ||
        testErr.response?.status ||
        500;
      const googleMessage =
        testErr.response?.data?.error?.message ||
        testErr.message ||
        "Failed to connect to Google Sheets";

      const is404 =
        httpStatus === 404 ||
        googleMessage.includes("404") ||
        googleMessage.toLowerCase().includes("not found");
      const is403 =
        httpStatus === 403 ||
        googleMessage.includes("403") ||
        googleMessage.toLowerCase().includes("permission") ||
        googleMessage.toLowerCase().includes("caller does not have permission");

      let userFriendlyError = googleMessage;
      let guidance = "";

      if (is404) {
        userFriendlyError = `Spreadsheet not found (404) for ID [${maskedSpreadsheetId}].`;
        guidance = serviceAccountEmail
          ? `Verify that the spreadsheet exists AND is shared with service account: "${serviceAccountEmail}" as Viewer. (Google returns 404 for unshared files). Ensure Google Sheets API is enabled in project "${projectId || "configured project"}".`
          : `Please check that spreadsheet ID "${maskedSpreadsheetId}" is correct and the file exists.`;
      } else if (is403) {
        userFriendlyError = `Access denied (403): Service account does not have permission for spreadsheet [${maskedSpreadsheetId}].`;
        guidance = serviceAccountEmail
          ? `Please share the Google Sheet with "${serviceAccountEmail}" as Viewer.`
          : `Please verify service account permissions.`;
      }

      const fullErrorMessage = guidance
        ? `${userFriendlyError} ${guidance}`
        : userFriendlyError;

      if (sourceDoc) {
        sourceDoc.status = "Error";
        sourceDoc.lastError = fullErrorMessage;
        sourceDoc.lastTestedAt = new Date();
        await sourceDoc.save();
      }

      return NextResponse.json(
        {
          success: false,
          error: fullErrorMessage,
          status: httpStatus,
          googleMessage,
          maskedSpreadsheetId,
          serviceAccountEmail,
          projectId,
          guidance,
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

