import mongoose from "mongoose";
import connectToDatabase from "./src/lib/mongodb";
import InterviewRoom from "./src/models/InterviewRoom";
import Applicant from "./src/models/Applicant";

async function run() {
  await connectToDatabase();
  console.log("Connected to MongoDB.");

  // Clear all rooms
  await InterviewRoom.updateMany({}, {
    $set: {
      interviewer: "",
      applicant: null,
      status: "Available",
      startedAt: null
    }
  });
  console.log("Cleared all rooms.");

  // Reset all applicants
  await Applicant.updateMany({}, {
    $set: {
      interviewStatus: "Waiting",
      assignedInterviewer: "",
      assignedRoom: null
    }
  });
  console.log("Reset all applicants to Waiting.");

  process.exit(0);
}

run();
