import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";

// Define a temporary schema and model for testing
const TestSchema = new mongoose.Schema({
  message: String,
  timestamp: { type: Date, default: Date.now }
});

// Avoid OverwriteModelError in Next.js by checking if it exists
const TestModel = mongoose.models.TestCollection || mongoose.model("TestCollection", TestSchema);

export async function GET() {
  try {
    // 1. Connect to MongoDB (using MONGODB_URI + dbName="nexus_recruit" from lib)
    await connectToDatabase();
    
    // 2. Insert a test document to ensure we have write access and the DB is created
    const testDoc = await TestModel.create({
      message: "Hello from NEXUS Recruit! MongoDB connection is successful.",
    });

    return NextResponse.json({
      success: true,
      data: testDoc
    });
  } catch (error: any) {
    console.error("Test DB API Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "An unknown error occurred connecting to MongoDB",
        stack: error.stack,
        details: error
      },
      { status: 500 }
    );
  }
}
