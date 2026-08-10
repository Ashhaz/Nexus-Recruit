import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IInterviewRoom extends Document {
  roomNumber: number;
  interviewer: string;
  applicant: Types.ObjectId | null;
  status: "Available" | "Occupied";
  startedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewRoomSchema: Schema = new Schema(
  {
    roomNumber: { type: Number, required: true, unique: true },
    interviewer: { type: String, default: "" },
    applicant: { type: Schema.Types.ObjectId, ref: "Applicant", default: null },
    status: {
      type: String,
      enum: ["Available", "Occupied"],
      default: "Available",
    },
    startedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

const InterviewRoom: Model<IInterviewRoom> =
  mongoose.models.InterviewRoom ||
  mongoose.model<IInterviewRoom>("InterviewRoom", InterviewRoomSchema);

export default InterviewRoom;
