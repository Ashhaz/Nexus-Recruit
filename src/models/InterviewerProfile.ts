import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInterviewerProfile extends Document {
  name: string;
  isArchived?: boolean;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewerProfileSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models && mongoose.models.InterviewerProfile) {
  delete mongoose.models.InterviewerProfile;
}

const InterviewerProfile: Model<IInterviewerProfile> =
  mongoose.model<IInterviewerProfile>("InterviewerProfile", InterviewerProfileSchema);

export default InterviewerProfile;

