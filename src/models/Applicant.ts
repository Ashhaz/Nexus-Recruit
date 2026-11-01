import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEvaluationCriterionSnapshot {
  id: string;
  label: string;
  score: number;
  maxScore: number;
}

export interface IApplicant extends Document {
  name: string;
  rollNumber: string;
  email?: string;
  phone?: string;
  department?: string;
  branch?: string;
  year?: string;
  teamApplied?: string;
  source?: string;
  eventId?: string;
  sourceId?: string;
  responses: Record<string, string>;
  
  interviewStatus: "Waiting" | "Interviewing" | "Approved" | "Pending" | "Discussion Needed";
  assignedRoom?: number | null;
  assignedInterviewer?: string;
  interviewDuration?: number;
  finalDecision?: string;
  interviewNotes?: string;
  evaluation?: {
    technical?: number | null;
    communication?: number | null;
    confidence?: number | null;
    leadership?: number | null;
    teamwork?: number | null;
    criteriaSnapshot?: IEvaluationCriterionSnapshot[];
    submittedAt?: Date;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const ApplicantSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    rollNumber: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    department: { type: String },
    branch: { type: String },
    year: { type: String },
    teamApplied: { type: String },
    source: { type: String, default: "" },
    eventId: { type: String, default: "", index: true },
    sourceId: { type: String, default: "" },
    responses: { type: Map, of: String, default: {} },
    
    interviewStatus: {
      type: String,
      enum: ["Waiting", "Interviewing", "Approved", "Pending", "Discussion Needed"],
      default: "Waiting",
    },
    assignedRoom: { type: Number, default: null },
    assignedInterviewer: { type: String, default: "" },
    interviewDuration: { type: Number, default: 0 },
    finalDecision: { type: String, default: "" },
    interviewNotes: { type: String, default: "" },
    evaluation: {
      technical: { type: Number, default: null },
      communication: { type: Number, default: null },
      confidence: { type: Number, default: null },
      leadership: { type: Number, default: null },
      teamwork: { type: Number, default: null },
      criteriaSnapshot: [
        {
          id: { type: String, required: true },
          label: { type: String, required: true },
          score: { type: Number, required: true },
          maxScore: { type: Number, required: true, default: 10 },
        },
      ],
      submittedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

ApplicantSchema.index({ eventId: 1, rollNumber: 1 }, { unique: true });

if (mongoose.models && mongoose.models.Applicant) {
  delete mongoose.models.Applicant;
}

const Applicant: Model<IApplicant> =
  mongoose.model<IApplicant>("Applicant", ApplicantSchema);

export default Applicant;
