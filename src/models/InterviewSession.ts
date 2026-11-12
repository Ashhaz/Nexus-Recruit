import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IInterviewSession extends Document {
  sessionId: string;
  applicantId: Types.ObjectId;
  roomNumber: number;
  eventId: string;
  interviewerId: string;
  interviewerName: string;
  clerkUserId?: string;
  status: "active" | "completed" | "abandoned";
  startedAt: Date;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSessionSchema: Schema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    applicantId: { type: Schema.Types.ObjectId, ref: "Applicant", required: true, index: true },
    roomNumber: { type: Number, required: true },
    eventId: { type: String, required: true, index: true, trim: true },
    interviewerId: { type: String, required: true },
    interviewerName: { type: String, default: "" },
    clerkUserId: { type: String, default: "", index: true },
    status: {
      type: String,
      enum: ["active", "completed", "abandoned"],
      default: "active",
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models && mongoose.models.InterviewSession) {
  delete mongoose.models.InterviewSession;
}

const InterviewSession: Model<IInterviewSession> =
  mongoose.models.InterviewSession ||
  mongoose.model<IInterviewSession>("InterviewSession", InterviewSessionSchema);

export default InterviewSession;

