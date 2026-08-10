import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Applicant from "@/models/Applicant";
import { getApplicantsFromGoogleSheet } from "@/lib/googleSheets";

// Helper to find a matching key based on keywords
function extractField(row: Record<string, string>, keywords: string[]): string {
  for (const key of Object.keys(row)) {
    const lower = key.toLowerCase();
    if (keywords.every(kw => lower.includes(kw))) {
      return row[key] || "";
    }
  }
  return "";
}

export async function POST() {
  try {
    await connectToDatabase();
    
    const sheetData = await getApplicantsFromGoogleSheet();
    
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of sheetData) {
      // Extract main fields heuristically due to dynamic form questions
      const name = extractField(row, ["name"]) || "Unknown";
      const rollNumber = extractField(row, ["roll"]);
      const email = extractField(row, ["mail"]);
      const phone = extractField(row, ["contact"]);
      const branch = extractField(row, ["branch"]);
      const year = extractField(row, ["year"]);
      const department = branch; // Mapping branch to department

      // If no roll number exists, we must skip because we can't uniquely identify them
      if (!rollNumber) {
        skipped++;
        continue;
      }

      // Sanitize Google Form question titles (MongoDB Map keys cannot contain "." or "$")
      const sanitizedResponses: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        const sanitizedKey = key.replace(/\.|\$/g, "_");
        sanitizedResponses[sanitizedKey] = value;
      }

      // Check if applicant already exists
      const existing = await Applicant.findOne({ rollNumber });

      const payload = {
        name,
        rollNumber,
        email,
        phone,
        department,
        branch,
        year,
        responses: sanitizedResponses, // Preserve all Google Form responses
        
        // Default values as per requirements (Mongoose defaults will also catch this)
        interviewStatus: "Waiting" as const,
        assignedRoom: null,
        assignedInterviewer: "",
        interviewDuration: 0,
        finalDecision: "",
        interviewNotes: ""
      };

      if (existing) {
        // We only want to update fields, but not override their interview status if it's already in progress
        await Applicant.updateOne({ rollNumber }, { 
          $set: {
            name,
            email,
            phone,
            department,
            branch,
            year,
            responses: sanitizedResponses
            // intentionally NOT overwriting interviewStatus etc. if they exist, to prevent resetting progress
          } 
        });
        updated++;
      } else {
        await Applicant.create(payload);
        imported++;
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      updated,
      skipped
    });

  } catch (error: any) {
    console.error("Sync API Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "An unknown error occurred" 
      },
      { status: 500 }
    );
  }
}
