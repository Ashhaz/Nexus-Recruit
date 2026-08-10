import { google } from "googleapis";

/**
 * Connects to Google Sheets using service account credentials,
 * reads the first worksheet, and returns an array of objects
 * where keys are from the first header row.
 */
export async function getApplicantsFromGoogleSheet(): Promise<Record<string, string>[]> {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!credentialsPath) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not defined in environment variables.");
  }

  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEET_ID is not defined in environment variables.");
  }

  try {
    // Authenticate using the service account credentials
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Retrieve spreadsheet metadata to dynamically find the first worksheet's name
    const spreadsheetInfo = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const firstSheetTitle = spreadsheetInfo.data.sheets?.[0]?.properties?.title;

    if (!firstSheetTitle) {
      throw new Error("No worksheets found in the provided Google Sheet.");
    }

    // Fetch all values from the first worksheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: firstSheetTitle,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return [];
    }

    // Treat the first row as headers
    const headers = rows[0] as string[];
    const dataRows = rows.slice(1);

    // Map each data row to an object using the headers as keys
    const applicants = dataRows.map((row) => {
      const applicantObj: Record<string, string> = {};
      headers.forEach((header, index) => {
        // Ensure values are strings and trimmed, fallback to empty string if undefined
        applicantObj[header] = row[index] !== undefined && row[index] !== null ? String(row[index]).trim() : "";
      });
      return applicantObj;
    });

    return applicants;
  } catch (error: any) {
    console.error("Error communicating with Google Sheets API:", error);
    throw new Error(`Google Sheets Error: ${error.message || "Failed to read data"}`);
  }
}
