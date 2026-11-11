import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Applicant from "@/models/Applicant";
import SheetSource from "@/models/SheetSource";
import { mapRowToApplicantData, getApplicantsFromGoogleSheet } from "@/lib/googleSheets";
import { importSheetSourceRows } from "@/lib/sheetImport";

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Administrator access required to trigger sync." },
        { status: 403 }
      );
    }

    await connectToDatabase();

    // Check if a specific source was requested in the JSON body
    let requestedSourceId: string | null = null;
    try {
      const body = await request.json();
      if (body && body.sourceId) requestedSourceId = body.sourceId;
    } catch {
      // Body may be empty on basic POST calls
    }

    let activeSources: any[] = [];
    if (requestedSourceId) {
      const single = await SheetSource.findById(requestedSourceId);
      if (single && single.isActive) activeSources = [single];
    } else {
      activeSources = await SheetSource.find({ isActive: true }).sort({ isDefault: -1 });
    }

    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    if (activeSources.length > 0) {
      for (const source of activeSources) {
        try {
          const result = await importSheetSourceRows(source);
          totalImported += result.imported;
          totalUpdated += result.updated;
          totalSkipped += result.skipped;
          totalFailed += result.failed;
        } catch (sourceErr: any) {
          console.error(`Error syncing source "${source.name}":`, sourceErr);
          source.status = "Error";
          source.lastError = sourceErr.message;
          await source.save();
        }
      }
    } else {
      // Fallback to legacy single sheet if no database sources configured
      const sheetData = await getApplicantsFromGoogleSheet();
      for (const row of sheetData) {
        const parsed = mapRowToApplicantData(row);
        if (!parsed.rollNumber) {
          totalSkipped++;
          continue;
        }

        const existing = await Applicant.findOne({ rollNumber: parsed.rollNumber });
        if (existing) {
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
                responses: parsed.sanitizedResponses,
              },
            }
          );
          totalUpdated++;
        } else {
          await Applicant.create({
            name: parsed.name,
            rollNumber: parsed.rollNumber,
            email: parsed.email,
            phone: parsed.phone,
            department: parsed.department,
            branch: parsed.branch,
            year: parsed.year,
            responses: parsed.sanitizedResponses,
            interviewStatus: "Waiting",
            assignedRoom: null,
            assignedInterviewer: "",
            interviewDuration: 0,
            finalDecision: "",
            interviewNotes: "",
          });
          totalImported++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported: totalImported,
      updated: totalUpdated,
      skipped: totalSkipped,
      failed: totalFailed,
    });
  } catch (error: any) {
    console.error("POST /api/applicants/sync Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "An unknown error occurred during sync",
      },
      { status: 500 }
    );
  }
}
