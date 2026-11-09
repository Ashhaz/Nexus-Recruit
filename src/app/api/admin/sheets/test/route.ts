import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import SheetSource from "@/models/SheetSource";
import {
  extractSpreadsheetId,
  maskSpreadsheetId,
  getSpreadsheetMetadata,
  getServiceAccountDetails,
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

    const maskedSpreadsheetId = maskSpreadsheetId(targetSpreadsheetId);

    // 1. Inspect Service Account Authentication Configuration
    const { email: serviceAccountEmail, projectId, error: authConfigError } = getServiceAccountDetails();

    if (authConfigError) {
      const authErrorMessage = `[Authentication Configuration Error] ${authConfigError}. Please verify that GOOGLE_APPLICATION_CREDENTIALS in Vercel contains valid service account JSON.`;

      if (sourceDoc) {
        sourceDoc.status = "Error";
        sourceDoc.lastError = authErrorMessage;
        sourceDoc.lastTestedAt = new Date();
        await sourceDoc.save();
      }

      return NextResponse.json(
        {
          success: false,
          error: authErrorMessage,
          status: 500,
          exactReason: authConfigError,
          maskedSpreadsheetId,
          serviceAccountEmail: "Unauthenticated",
          projectId: "Unknown",
          guidance: "Please verify that GOOGLE_APPLICATION_CREDENTIALS contains the valid Google Service Account JSON string in Vercel Environment Variables.",
        },
        { status: 400 }
      );
    }

    try {
      // 2. Query Google Sheets API for spreadsheet metadata
      const metadata = await getSpreadsheetMetadata(targetSpreadsheetId);
      const targetSheet = sheetName || sourceDoc?.sheetName || metadata.sheets[0];

      // 3. Query sample data row
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
      const isGoogleApiCall = Boolean(testErr.response);
      const googleError = testErr.response?.data?.error;
      const exactReason =
        googleError?.message ||
        testErr.message ||
        "Failed to connect to Google Sheets";
      const googleStatusText = googleError?.status || "";
      const httpStatus =
        testErr.response?.status ||
        testErr.status ||
        testErr.code ||
        500;

      const is404 = isGoogleApiCall && (httpStatus === 404 || googleStatusText === "NOT_FOUND");
      const is403 = isGoogleApiCall && (httpStatus === 403 || googleStatusText === "PERMISSION_DENIED");

      let guidance = "";
      let fullErrorMessage = "";

      if (is404) {
        guidance = `Verify that this spreadsheet exists AND is shared with service account: "${serviceAccountEmail}" as Viewer. (Google returns 404 when access is not shared). Also ensure Google Sheets API is enabled in Google Cloud project "${projectId}".`;
        fullErrorMessage = `[Google Sheets API 404: ${exactReason}] Spreadsheet [${maskedSpreadsheetId}] not found for service account "${serviceAccountEmail}". ${guidance}`;
      } else if (is403) {
        guidance = `Please share the Google Sheet with "${serviceAccountEmail}" as Viewer.`;
        fullErrorMessage = `[Google Sheets API 403: ${exactReason}] Access denied for service account "${serviceAccountEmail}". ${guidance}`;
      } else {
        guidance = `Verify service account permissions and Google Cloud project configuration.`;
        fullErrorMessage = isGoogleApiCall
          ? `[Google Sheets API Error ${httpStatus}: ${exactReason}] Service Account: "${serviceAccountEmail}" (Project: "${projectId}").`
          : `[Local API Error: ${exactReason}] Service Account: "${serviceAccountEmail || "None"}".`;
      }

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
          exactReason,
          googleStatusText,
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

