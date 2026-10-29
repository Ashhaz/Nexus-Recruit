import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInterviewerProfile extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewerProfileSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  {
    timestamps: true,
  }
);

const InterviewerProfile: Model<IInterviewerProfile> =
  mongoose.models.InterviewerProfile ||
  mongoose.model<IInterviewerProfile>("InterviewerProfile", InterviewerProfileSchema);

export default InterviewerProfile;

