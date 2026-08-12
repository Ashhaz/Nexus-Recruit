import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IInterviewRoom extends Document {
  roomNumber: number;
  interviewerId: string;
  interviewer: string;
  applicant: Types.ObjectId | null;
  status: "Available" | "Occupied";
  startedAt: Date | null;
  pausedAt: Date | null;
  accumulatedTime: number;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewRoomSchema: Schema = new Schema(
  {
    roomNumber: { type: Number, required: true, unique: true },
    interviewerId: { type: String, default: "" },
    interviewer: { type: String, default: "" },
    applicant: { type: Schema.Types.ObjectId, ref: "Applicant", default: null },
    status: {
      type: String,
      enum: ["Available", "Occupied"],
      default: "Available",
    },
    startedAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
    accumulatedTime: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.InterviewRoom && !mongoose.models.InterviewRoom.schema.paths.pausedAt) {
  delete mongoose.models.InterviewRoom;
}

const InterviewRoom: Model<IInterviewRoom> =
  mongoose.models.InterviewRoom ||
  mongoose.model<IInterviewRoom>("InterviewRoom", InterviewRoomSchema);

export default InterviewRoom;
