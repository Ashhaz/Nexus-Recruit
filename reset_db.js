const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

const roomSchema = new mongoose.Schema({}, { strict: false });
const applicantSchema = new mongoose.Schema({}, { strict: false });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  const Room = mongoose.models.InterviewRoom || mongoose.model("InterviewRoom", roomSchema, "interviewrooms");
  const Applicant = mongoose.models.Applicant || mongoose.model("Applicant", applicantSchema, "applicants");

  // Clear all rooms
  await Room.updateMany({}, {
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
