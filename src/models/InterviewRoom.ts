import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IInterviewRoom extends Document {
  roomNumber: number;
  name?: string;
  interviewerId: string;
  interviewer: string;
  assignedInterviewer?: string;
  assignedInterviewerId?: string;
  applicant: Types.ObjectId | null;
  status: "Available" | "Occupied";
  isActive: boolean;
  startedAt: Date | null;
  pausedAt: Date | null;
  accumulatedTime: number;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewRoomSchema: Schema = new Schema(
  {
    roomNumber: { type: Number, required: true, unique: true },
    name: { type: String, default: "" },
    interviewerId: { type: String, default: "" },
    interviewer: { type: String, default: "" },
    assignedInterviewer: { type: String, default: "" },
    assignedInterviewerId: { type: String, default: "" },
    applicant: { type: Schema.Types.ObjectId, ref: "Applicant", default: null },
    status: {
      type: String,
      enum: ["Available", "Occupied"],
      default: "Available",
    },
    isActive: { type: Boolean, default: true },
    startedAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
    accumulatedTime: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.InterviewRoom && (!mongoose.models.InterviewRoom.schema.paths.pausedAt || !mongoose.models.InterviewRoom.schema.paths.isActive)) {
  delete mongoose.models.InterviewRoom;
}

const InterviewRoom: Model<IInterviewRoom> =
  mongoose.models.InterviewRoom ||
  mongoose.model<IInterviewRoom>("InterviewRoom", InterviewRoomSchema);

export default InterviewRoom;
