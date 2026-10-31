import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import SheetSource from "@/models/SheetSource";
import { extractSpreadsheetId, getServiceAccountEmail } from "@/lib/googleSheets";

// Seed default sheet from environment variable if missing
async function ensureDefaultSource() {
  const envSheetId = process.env.GOOGLE_SHEET_ID;
  if (!envSheetId) return;

  const existingDefault = await SheetSource.findOne({
    $or: [{ spreadsheetId: envSheetId }, { isDefault: true }],
  });

  if (!existingDefault) {
    await SheetSource.create({
      name: "Primary Registration Sheet",
      spreadsheetId: envSheetId,
      url: `https://docs.google.com/spreadsheets/d/${envSheetId}/edit`,
      sheetName: "",
      range: "",
      isActive: true,
      status: "Never Tested",
      isDefault: true,
    });
  }
}

export async function GET() {
  try {
    const session = await getAuthSession();
    if (session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Administrator access required." },
        { status: 403 }
      );
    }

    await connectToDatabase();
    await ensureDefaultSource();

    const sources = await SheetSource.find({}).sort({ isDefault: -1, createdAt: 1 }).lean();
    const serviceAccountEmail = getServiceAccountEmail();

    return NextResponse.json({
      success: true,
      sources,
      serviceAccountEmail,
    });
  } catch (error: any) {
    console.error("GET /api/admin/sheets Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch spreadsheet sources." },
      { status: 500 }
    );
  }
}

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
    const { name, url, sheetName, range } = body;

    const trimmedName = name?.trim();
    const trimmedUrl = url?.trim();

    if (!trimmedName) {
      return NextResponse.json(
        { success: false, error: "Source Name is required." },
        { status: 400 }
      );
    }

    if (!trimmedUrl) {
      return NextResponse.json(
        { success: false, error: "Google Sheets URL or Spreadsheet ID is required." },
        { status: 400 }
      );
    }

    const spreadsheetId = extractSpreadsheetId(trimmedUrl);
    if (!spreadsheetId || spreadsheetId.length < 15) {
      return NextResponse.json(
        { success: false, error: "Invalid Google Sheets URL or Spreadsheet ID format." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check for duplicate source name or duplicate spreadsheetId
    const existing = await SheetSource.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${trimmedName}$`, "i") } },
        { spreadsheetId },
      ],
    });

    if (existing) {
      if (existing.name.toLowerCase() === trimmedName.toLowerCase()) {
        return NextResponse.json(
          { success: false, error: `A source named "${trimmedName}" already exists.` },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: `Spreadsheet "${spreadsheetId}" is already configured as "${existing.name}".` },
        { status: 400 }
      );
    }

    const normalizedUrl = trimmedUrl.startsWith("http")
      ? trimmedUrl
      : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    const newSource = await SheetSource.create({
      name: trimmedName,
      spreadsheetId,
      url: normalizedUrl,
      sheetName: sheetName?.trim() || "",
      range: range?.trim() || "",
      isActive: true,
      status: "Never Tested",
      isDefault: false,
    });

    return NextResponse.json(
      { success: true, source: newSource },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/admin/sheets Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create spreadsheet source." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getAuthSession();
    if (session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Administrator access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name, url, sheetName, range, isActive } = body;

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

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return NextResponse.json(
          { success: false, error: "Source Name cannot be empty." },
          { status: 400 }
        );
      }
      source.name = trimmedName;
    }

    if (url !== undefined) {
      const trimmedUrl = url.trim();
      const extractedId = extractSpreadsheetId(trimmedUrl);
      if (!extractedId || extractedId.length < 15) {
        return NextResponse.json(
          { success: false, error: "Invalid Google Sheets URL or ID format." },
          { status: 400 }
        );
      }
      source.spreadsheetId = extractedId;
      source.url = trimmedUrl.startsWith("http")
        ? trimmedUrl
        : `https://docs.google.com/spreadsheets/d/${extractedId}/edit`;
      // Reset test status if URL changed
      source.status = "Never Tested";
      source.lastError = null;
    }

    if (sheetName !== undefined) {
      source.sheetName = sheetName.trim();
    }

    if (range !== undefined) {
      source.range = range.trim();
    }

    if (isActive !== undefined) {
      source.isActive = Boolean(isActive);
    }

    await source.save();

    return NextResponse.json({ success: true, source });
  } catch (error: any) {
    console.error("PATCH /api/admin/sheets Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update spreadsheet source." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getAuthSession();
    if (session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Administrator access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Source ID query param is required." },
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

    if (source.isDefault) {
      return NextResponse.json(
        {
          success: false,
          error: "The primary default spreadsheet cannot be deleted. You can deactivate it instead.",
        },
        { status: 400 }
      );
    }

    await SheetSource.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: `Spreadsheet source "${source.name}" deleted successfully.`,
    });
  } catch (error: any) {
    console.error("DELETE /api/admin/sheets Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete spreadsheet source." },
      { status: 500 }
    );
  }
}

