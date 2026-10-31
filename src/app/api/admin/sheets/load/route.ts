import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import SheetSource from "@/models/SheetSource";
import Applicant from "@/models/Applicant";
import { fetchSheetRows, mapRowToApplicantData } from "@/lib/googleSheets";

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

    // Fetch all rows from spreadsheet
    const sheetResult = await fetchSheetRows({
      spreadsheetId: source.spreadsheetId,
      sheetName: source.sheetName,
      range: source.range,
    });

    const dataRows = sheetResult.rows;
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const skippedDetails: { rowNumber: number; reason: string; name?: string }[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const parsed = mapRowToApplicantData(row);

      // Roll number is the unique identity rule across NEXUS
      if (!parsed.rollNumber) {
        skipped++;
        if (skippedDetails.length < 15) {
          skippedDetails.push({
            rowNumber: i + 2, // 1-indexed accounting for header row
            reason: "Missing Roll Number / Student Identifier",
            name: parsed.name !== "Unknown" ? parsed.name : undefined,
          });
        }
        continue;
      }

      // Check if applicant already exists in database
      const existing = await Applicant.findOne({ rollNumber: parsed.rollNumber });

      if (existing) {
        // Safe update: update registration information but PRESERVE interview progress
        await Applicant.updateOne(
          { rollNumber: parsed.rollNumber },
          {
            $set: {
              name: parsed.name !== "Unknown" ? parsed.name : existing.name,
              email: parsed.email || existing.email,
              phone: parsed.phone || existing.phone,
              department: parsed.department || existing.department,
              branch: parsed.branch || existing.branch,
              year: parsed.year || existing.year,
              teamApplied: parsed.teamApplied || existing.teamApplied,
              source: source.name,
              responses: parsed.sanitizedResponses,
              // Strictly PRESERVE:
              // interviewStatus, assignedRoom, assignedInterviewer,
              // interviewDuration, finalDecision, interviewNotes, evaluation
            },
          }
        );
        updated++;
      } else {
        // Safe insert: new applicant starts in "Waiting" status
        await Applicant.create({
          name: parsed.name,
          rollNumber: parsed.rollNumber,
          email: parsed.email,
          phone: parsed.phone,
          department: parsed.department,
          branch: parsed.branch,
          year: parsed.year,
          teamApplied: parsed.teamApplied,
          source: source.name,
          responses: parsed.sanitizedResponses,
          interviewStatus: "Waiting",
          assignedRoom: null,
          assignedInterviewer: "",
          interviewDuration: 0,
          finalDecision: "",
          interviewNotes: "",
          evaluation: {
            technical: null,
            communication: null,
            confidence: null,
            leadership: null,
            teamwork: null,
          },
        });
        imported++;
      }
    }

    // Persist sync metadata on the source document
    source.status = "Connected";
    source.lastError = null;
    source.lastLoadedAt = new Date();
    source.lastImportStats = {
      totalRows: dataRows.length,
      imported,
      updated,
      skipped,
    };
    await source.save();

    return NextResponse.json({
      success: true,
      sourceName: source.name,
      totalRows: dataRows.length,
      imported,
      updated,
      skipped,
      skippedReasons: skippedDetails,
      message: `Data load complete for "${source.name}": ${imported} inserted, ${updated} updated, ${skipped} skipped.`,
    });
  } catch (error: any) {
    console.error("POST /api/admin/sheets/load Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load data from spreadsheet." },
      { status: 500 }
    );
  }
}

