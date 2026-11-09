import { google } from "googleapis";
import fs from "fs";
import path from "path";

/**
 * Extracts a Google Spreadsheet ID from various Google Sheets / Drive URLs or raw ID strings.
 * Handles standard URLs, multi-account URLs (/u/0/, /u/1/), Drive URLs, query parameters,
 * hash fragments, trailing edit/view paths, and raw IDs with extraneous whitespace.
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return "";
  let trimmed = input.trim();

  // Strip surrounding quotes if present
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  // 1. Matches /spreadsheets/.../d/<ID> or /file/d/<ID> or /d/<ID>
  const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (dMatch && dMatch[1]) {
    return dMatch[1];
  }

  // 2. Matches ?id=<ID> or &id=<ID> (Google Drive open links)
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  // 3. Strip URL scheme and domain if any
  trimmed = trimmed.replace(/^https?:\/\/[^/]+/i, "");

  // 4. Strip query parameters (?...) and hash fragments (#...)
  trimmed = trimmed.split("?")[0].split("#")[0];

  // 5. Strip common path suffixes like /edit, /view, /preview, /pubhtml, /htmlview, /copy, etc.
  trimmed = trimmed.replace(/\/(?:edit|view|preview|pubhtml|pub|htmlview|copy|export).*$/i, "");

  // 6. Strip leading and trailing slashes
  trimmed = trimmed.replace(/^\/+|\/+$/g, "").trim();

  // 7. Direct ID check: Must be alphanumeric + hyphens/underscores, not a numeric gid
  const directMatch = trimmed.match(/^([a-zA-Z0-9-_]+)$/);
  if (directMatch && directMatch[1]) {
    const val = directMatch[1];
    // Reject pure numbers < 20 chars (common for gid=1107616443)
    if (/^\d+$/.test(val) && val.length < 20) {
      return "";
    }
    return val;
  }

  return trimmed;
}

/**
 * Safely masks a spreadsheet ID for display in diagnostics and logs (e.g. 1Gt1Ud...AvJA).
 */
export function maskSpreadsheetId(id: string): string {
  if (!id) return "";
  const clean = id.trim();
  if (clean.length <= 10) return clean;
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

/**
 * Safely formats a worksheet name and range in standard Google Sheets A1 notation.
 * Properly wraps worksheet names containing spaces or special characters in single quotes
 * and escapes any embedded single quotes.
 */
export function formatSheetRange(sheetName: string, range?: string): string {
  const cleanSheet = sheetName.replace(/^'|'$/g, "").replace(/''/g, "'");
  const safeSheet = `'${cleanSheet.replace(/'/g, "''")}'`;
  if (!range || !range.trim()) {
    return safeSheet;
  }
  return `${safeSheet}!${range.trim()}`;
}

/**
 * Service account credential structure.
 */
export interface ServiceAccountCredentials {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key?: string;
  client_email?: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
  [key: string]: unknown;
}

/**
 * Loads service account credentials from GOOGLE_APPLICATION_CREDENTIALS.
 * Supports two formats using this SAME environment variable:
 *   1. Vercel deployment: JSON string beginning with '{' -> parsed directly with JSON.parse().
 *   2. Local development: File path -> loaded from filesystem.
 */
export function getServiceAccountCredentials(): ServiceAccountCredentials {
  const rawValue = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  if (!rawValue) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS is not defined in environment variables. Please check your configuration."
    );
  }

  let cleanedValue = rawValue.replace(/^\uFEFF/, "").trim();

  // Handle JSON string wrapped in outer double or single quotes
  if (
    (cleanedValue.startsWith('"') && cleanedValue.endsWith('"')) ||
    (cleanedValue.startsWith("'") && cleanedValue.endsWith("'"))
  ) {
    try {
      cleanedValue = JSON.parse(cleanedValue);
    } catch {
      cleanedValue = cleanedValue.slice(1, -1).trim();
    }
  }

  // Handle Base64-encoded JSON (commonly used in Vercel to preserve newlines)
  if (typeof cleanedValue === "string" && !cleanedValue.startsWith("{")) {
    try {
      const decoded = Buffer.from(cleanedValue, "base64").toString("utf-8").trim();
      if (decoded.startsWith("{") && decoded.endsWith("}")) {
        cleanedValue = decoded;
      }
    } catch {
      // not base64 encoded, continue to file path check
    }
  }

  // Format 1: Vercel deployment (JSON string beginning with '{')
  if (typeof cleanedValue === "string" && cleanedValue.startsWith("{")) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleanedValue);
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
    } catch {
      throw new Error(
        "Failed to parse GOOGLE_APPLICATION_CREDENTIALS: Value begins with '{' but is not valid JSON."
      );
    }

    if (!parsed || typeof parsed !== "object" || !parsed.client_email || !parsed.private_key) {
      throw new Error(
        "Invalid GOOGLE_APPLICATION_CREDENTIALS JSON: Missing required 'client_email' or 'private_key'."
      );
    }

    if (typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }

    return parsed as ServiceAccountCredentials;
  }

  // Format 2: Local development (filesystem path)
  const resolvedPath = path.isAbsolute(rawValue)
    ? rawValue
    : path.resolve(/*turbopackIgnore: true*/ process.cwd(), rawValue);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Credentials Error: Service account credentials file does not exist at path "${rawValue}". On Vercel, paste the full JSON string starting with '{' into GOOGLE_APPLICATION_CREDENTIALS.`
    );
  }

  try {
    const fileContent = fs.readFileSync(resolvedPath, "utf-8");
    const parsed = JSON.parse(fileContent);

    if (!parsed || typeof parsed !== "object" || !parsed.client_email || !parsed.private_key) {
      throw new Error(
        `Invalid credentials file at "${rawValue}": Missing 'client_email' or 'private_key'.`
      );
    }

    if (typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }

    return parsed as ServiceAccountCredentials;
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    if (errMessage.includes("Invalid credentials file")) {
      throw err;
    }
    throw new Error(
      `Failed to read or parse Google service account file at "${rawValue}": ${errMessage}`
    );
  }
}

/**
 * Reads the client_email from the configured service account credentials.
 */
export function getServiceAccountEmail(): string {
  try {
    const credentials = getServiceAccountCredentials();
    return credentials.client_email || "";
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn("Could not read service account email:", message);
    return "";
  }
}

/**
 * Reads the project_id from the configured service account credentials.
 */
export function getServiceAccountProjectId(): string {
  try {
    const credentials = getServiceAccountCredentials();
    return credentials.project_id || "";
  } catch {
    return "";
  }
}

/**
 * Returns safe credential metadata (email and projectId), or the credential error if invalid.
 */
export function getServiceAccountDetails(): {
  email: string;
  projectId: string;
  error?: string;
} {
  try {
    const credentials = getServiceAccountCredentials();
    return {
      email: credentials.client_email || "",
      projectId: credentials.project_id || "",
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      email: "",
      projectId: "",
      error: message,
    };
  }
}

/**
 * Returns an authenticated Google Sheets API client using server-side service account credentials.
 */
export function getGoogleSheetsClient() {
  const credentials = getServiceAccountCredentials();

  const auth = new google.auth.GoogleAuth({
    credentials,
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
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    throw new Error("Invalid Google Spreadsheet ID provided.");
  }

  const sheets = getGoogleSheetsClient();
  const res = await sheets.spreadsheets.get({ spreadsheetId: cleanId });
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
  const cleanSpreadsheetId = extractSpreadsheetId(spreadsheetId);
  if (!cleanSpreadsheetId) {
    throw new Error("Invalid Google Spreadsheet ID provided.");
  }

  const sheets = getGoogleSheetsClient();

  // Retrieve metadata to ensure sheet exists and identify target worksheet
  const metadata = await getSpreadsheetMetadata(cleanSpreadsheetId);
  const targetSheet = sheetName && metadata.sheets.includes(sheetName)
    ? sheetName
    : metadata.sheets[0];

  if (!targetSheet) {
    throw new Error("No worksheets found in the provided Google Spreadsheet.");
  }

  // Safely format range using single-quoted sheet name
  const fetchRange = formatSheetRange(targetSheet, range);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: cleanSpreadsheetId,
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
