require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not defined in .env.local");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB successfully.");

    const db = mongoose.connection.db;
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
    console.error("An error occurred:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

main();
