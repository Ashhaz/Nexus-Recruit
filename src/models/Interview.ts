import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInterview extends Document {
  applicantId: mongoose.Types.ObjectId;
  interviewerId: mongoose.Types.ObjectId;
  roomNumber: number;
  status: "Waiting" | "Interviewing" | "Completed";
  ratings: {
    technical: number;
    communication: number;
    confidence: number;
    leadership: number;
    teamwork: number;
  };
  notes: string;
  decision: "Approved" | "Pending" | "Discussion Needed";
  startTime?: Date;
  endTime?: Date;
  duration?: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema: Schema = new Schema(
  {
    applicantId: { type: Schema.Types.ObjectId, ref: "Applicant", required: true },
    interviewerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    roomNumber: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Waiting", "Interviewing", "Completed"],
      default: "Waiting",
    },
    ratings: {
      technical: { type: Number, min: 0, max: 10 },
      communication: { type: Number, min: 0, max: 10 },
      confidence: { type: Number, min: 0, max: 10 },
      leadership: { type: Number, min: 0, max: 10 },
      teamwork: { type: Number, min: 0, max: 10 },
    },
    notes: { type: String, default: "" },
    decision: {
      type: String,
      enum: ["Approved", "Pending", "Discussion Needed"],
    },
    startTime: { type: Date },
    endTime: { type: Date },
    duration: { type: Number },
  },
  {
    timestamps: true,
  }
);

const Interview: Model<IInterview> =
  mongoose.models.Interview || mongoose.model<IInterview>("Interview", InterviewSchema);

export default Interview;
