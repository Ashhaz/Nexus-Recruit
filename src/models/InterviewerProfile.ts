import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInterviewerProfile extends Document {
  name: string;
  email?: string;
  clerkUserId?: string;
  interviewerId?: string;
  isArchived?: boolean;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewerProfileSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    email: { type: String, default: "", trim: true },
    clerkUserId: { type: String, default: "", index: true, trim: true },
    interviewerId: { type: String, default: "", trim: true },
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

