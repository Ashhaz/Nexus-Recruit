import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  try {
    const { default: connectToDatabase } = await import("./src/lib/mongodb");
    const mongoose = await import("mongoose");

    const conn = await connectToDatabase();
    console.log("Database connection resolved.");

    const db = conn.connection.db;
    if (!db) {
      throw new Error("Failed to retrieve db instance from connection.");
    }

    const result = await db.collection("interviewrooms").updateMany(
      { roomNumber: { $in: [1, 2] } },
      {
        $set: {
          status: "Available",
          applicant: null,
          interviewer: "",
          interviewerId: "",
          startedAt: null,
          pausedAt: null,
          accumulatedTime: 0
        }
      }
    );

    console.log("Rooms 1 and 2 reset.");
    console.log(`Matched ${result.matchedCount} documents, modified ${result.modifiedCount} documents.`);
  } catch (error) {
    console.error("An error occurred during reset:", error);
  } finally {
    const mongoose = await import("mongoose");
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

main();
