import { google } from "googleapis";
import fs from "fs";
import path from "path";

/**
 * Extracts a Google Spreadsheet ID from either a full URL or a raw ID string.
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  return trimmed;
}

/**
 * Reads the client_email from the configured service account credentials file.
 */
export function getServiceAccountEmail(): string {
  try {
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credentialsPath && fs.existsSync(credentialsPath)) {
      const fileContent = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
      return fileContent.client_email || "";
    }
  } catch (e) {
    console.warn("Could not read service account email from file:", e);
  }
  return "";
}

/**
 * Returns an authenticated Google Sheets API client using server-side service account credentials.
 */
export function getGoogleSheetsClient() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS is not defined in environment variables. Please check .env.local"
    );
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return google.sheets({ version: "v4", auth });
}

export interface SheetMetadata {
  title: string;
  sheets: string[];
}

/**
 * Retrieves metadata for a spreadsheet (spreadsheet title and all tab/worksheet names).
 */
export async function getSpreadsheetMetadata(spreadsheetId: string): Promise<SheetMetadata> {
  const sheets = getGoogleSheetsClient();
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  const title = res.data.properties?.title || "Untitled Spreadsheet";
  const sheetTitles = (res.data.sheets || [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => Boolean(t));

  return { title, sheets: sheetTitles };
}

export interface FetchSheetOptions {
  spreadsheetId: string;
  sheetName?: string;
  range?: string;
  limit?: number;
}

/**
 * Fetches headers and data rows from a specified spreadsheet and worksheet.
 */
export async function fetchSheetRows(options: FetchSheetOptions): Promise<{
  title: string;
  sheetName: string;
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}> {
  const { spreadsheetId, sheetName, range, limit } = options;
  const sheets = getGoogleSheetsClient();

  // Retrieve metadata to ensure sheet exists and identify target worksheet
  const metadata = await getSpreadsheetMetadata(spreadsheetId);
  const targetSheet = sheetName && metadata.sheets.includes(sheetName)
    ? sheetName
    : metadata.sheets[0];

  if (!targetSheet) {
    throw new Error("No worksheets found in the provided Google Spreadsheet.");
  }

  // Construct query range: e.g. "Sheet1" or "Sheet1!A:Z"
  const fetchRange = range ? `${targetSheet}!${range}` : targetSheet;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: fetchRange,
  });

  const allValues = response.data.values || [];
  if (allValues.length === 0) {
    return {
      title: metadata.title,
      sheetName: targetSheet,
      headers: [],
      rows: [],
      totalRows: 0,
    };
  }

  const headers = (allValues[0] as string[]).map((h) => String(h || "").trim());
  const dataRows = allValues.slice(1);
  const totalRows = dataRows.length;

  const rowsToProcess = limit && limit > 0 ? dataRows.slice(0, limit) : dataRows;

  const rows = rowsToProcess.map((row) => {
    const rowObj: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowObj[header] = row[index] !== undefined && row[index] !== null ? String(row[index]).trim() : "";
    });
    return rowObj;
  });

  return {
    title: metadata.title,
    sheetName: targetSheet,
    headers,
    rows,
    totalRows,
  };
}

/**
 * Heuristically extracts a field from a row by checking if all given keywords match any header key.
 */
export function extractField(row: Record<string, string>, keywords: string[]): string {
  for (const key of Object.keys(row)) {
    const lower = key.toLowerCase();
    if (keywords.every((kw) => lower.includes(kw))) {
      return row[key] || "";
    }
  }
  return "";
}

/**
 * Maps a generic spreadsheet row object to standard Applicant attributes.
 */
export function mapRowToApplicantData(row: Record<string, string>) {
  const name = extractField(row, ["name"]) || "Unknown";
  const rollNumber = extractField(row, ["roll"]);
  const email = extractField(row, ["mail"]);
  const phone = extractField(row, ["contact"]) || extractField(row, ["phone"]);
  const branch = extractField(row, ["branch"]);
  const year = extractField(row, ["year"]);
  const department = branch;
  const teamApplied = extractField(row, ["team"]) || extractField(row, ["domain"]);

  // Sanitize Google Form question titles (MongoDB Map keys cannot contain "." or "$")
  const sanitizedResponses: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const sanitizedKey = key.replace(/\.|\$/g, "_");
    sanitizedResponses[sanitizedKey] = value;
  }

  return {
    name,
    rollNumber,
    email,
    phone,
    department,
    branch,
    year,
    teamApplied,
    sanitizedResponses,
  };
}

/**
 * Backward compatibility: Reads applicants from the default env-configured Google Sheet.
 */
export async function getApplicantsFromGoogleSheet(): Promise<Record<string, string>[]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEET_ID is not defined in environment variables.");
  }

  const { rows } = await fetchSheetRows({ spreadsheetId });
  return rows;
}
