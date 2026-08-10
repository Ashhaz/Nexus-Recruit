import { NextResponse } from "next/server";
import { getApplicantsFromGoogleSheet } from "@/lib/googleSheets";

export async function GET() {
  try {
    const applicants = await getApplicantsFromGoogleSheet();
    return NextResponse.json(applicants);
  } catch (error: any) {
    console.error("Test Sheet API Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "An unknown error occurred" 
      },
      { status: 500 }
    );
  }
}
