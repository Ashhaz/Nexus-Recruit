import Applicant from "@/models/Applicant";
import { ISheetSource } from "@/models/SheetSource";
import { fetchSheetRows, mapRowToApplicantData } from "@/lib/googleSheets";

export interface RowIssueDetail {
  rowNumber: number;
  reason: string;
  name?: string;
}

export interface SheetImportResult {
  totalRows: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  applicantCount: number;
  skippedDetails: RowIssueDetail[];
  failedDetails: RowIssueDetail[];
}

/**
 * Repairs any existing event-scoped applicant documents whose rollNumber was previously
 * mis-extracted (e.g., matching "enroll" instead of "ROLL NUMBER") using their stored responses.
 * Strictly updates in-place within the same event without deleting or overwriting interview data.
 */
async function repairMisextractedRollNumbers(eventId: string): Promise<void> {
  const existingDocs = await Applicant.find(
    { eventId },
    { _id: 1, rollNumber: 1, responses: 1 }
  ).lean();

  if (existingDocs.length === 0) return;

  const existingRollSet = new Set(existingDocs.map((d) => String(d.rollNumber)));

  for (const doc of existingDocs) {
    const rawResponses = doc.responses as unknown;
    const responses: Record<string, string> =
      rawResponses instanceof Map
        ? Object.fromEntries(rawResponses)
        : ((rawResponses as Record<string, string>) || {});
    if (!responses || typeof responses !== "object" || Object.keys(responses).length === 0) {
      continue;
    }

    const parsed = mapRowToApplicantData(responses);
    const trueRoll = parsed.rollNumber?.trim();

    if (trueRoll && trueRoll !== doc.rollNumber && !existingRollSet.has(trueRoll)) {
      await Applicant.updateOne(
        { _id: doc._id, eventId },
        { $set: { rollNumber: trueRoll } }
      );
      existingRollSet.delete(String(doc.rollNumber));
      existingRollSet.add(trueRoll);
    }
  }
}

/**
 * Imports and upserts rows from a SheetSource into the Applicant collection scoped strictly to source._id.
 * Preserves all existing interview statuses, notes, evaluations, durations, and decisions.
 */
export async function importSheetSourceRows(source: ISheetSource): Promise<SheetImportResult> {
  const eventId = String(source._id);

  const sheetResult = await fetchSheetRows({
    spreadsheetId: source.spreadsheetId,
    sheetName: source.sheetName,
    range: source.range,
  });

  // Repair any legacy mis-extracted rollNumbers within this event in-place before matching
  await repairMisextractedRollNumbers(eventId);

  const dataRows = sheetResult.rows;
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const skippedDetails: RowIssueDetail[] = [];
  const failedDetails: RowIssueDetail[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 2; // 1-indexed accounting for header row
    const parsed = mapRowToApplicantData(row);

    // Roll number is the unique identity rule scoped to this event
    if (!parsed.rollNumber) {
      skipped++;
      if (skippedDetails.length < 15) {
        skippedDetails.push({
          rowNumber,
          reason: "Missing Roll Number / Student Identifier",
          name: parsed.name !== "Unknown" ? parsed.name : undefined,
        });
      }
      continue;
    }

    try {
      const existing = await Applicant.findOne({
        eventId,
        rollNumber: parsed.rollNumber,
      });

      if (existing) {
        // Safe update: update registration info only; strictly preserve interview progress
        await Applicant.updateOne(
          { _id: existing._id, eventId },
          {
            $set: {
              name: parsed.name !== "Unknown" ? parsed.name : existing.name,
              email: parsed.email || existing.email,
              phone: parsed.phone || existing.phone,
              department: parsed.department || existing.department,
              branch: parsed.branch || existing.branch,
              year: parsed.year || existing.year,
              teamApplied: parsed.teamApplied || existing.teamApplied,
              appliedPath: parsed.appliedPath || (existing as any).appliedPath || null,
              source: source.name,
              sourceId: eventId,
              eventId,
              responses: parsed.sanitizedResponses,
            },
          }
        );
        updated++;
      } else {
        await Applicant.create({
          name: parsed.name,
          rollNumber: parsed.rollNumber,
          email: parsed.email,
          phone: parsed.phone,
          department: parsed.department,
          branch: parsed.branch,
          year: parsed.year,
          teamApplied: parsed.teamApplied,
          appliedPath: parsed.appliedPath || null,
          source: source.name,
          sourceId: eventId,
          eventId,
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
    } catch (err: unknown) {
      failed++;
      const reason = err instanceof Error ? err.message : "Database upsert failed";
      if (failedDetails.length < 15) {
        failedDetails.push({
          rowNumber,
          reason,
          name: parsed.name !== "Unknown" ? parsed.name : undefined,
        });
      }
    }
  }

  const applicantCount = await Applicant.countDocuments({ eventId });
  source.applicantCount = applicantCount;
  source.status = "Connected";
  source.lastError = null;
  source.lastLoadedAt = new Date();
  source.lastImportStats = {
    totalRows: dataRows.length,
    imported,
    updated,
    skipped,
    failed,
  };
  await source.save();

  return {
    totalRows: dataRows.length,
    imported,
    updated,
    skipped,
    failed,
    applicantCount,
    skippedDetails,
    failedDetails,
  };
}
