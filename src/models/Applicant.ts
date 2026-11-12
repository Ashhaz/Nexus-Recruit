import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEvaluationCriterionSnapshot {
  id: string;
  label: string;
  score: number;
  maxScore: number;
}

export interface ICriterionEvaluationSnapshot {
  id: string;
  name: string;
  description: string;
  weight: number;
  rating: number | null;
  weightedScore: number;
  feedback?: string;
  reviewed?: boolean;
}

export interface ICriteriaEvaluationSnapshot {
  rubricVersion: string;
  path: string;
  criteria: ICriterionEvaluationSnapshot[];
  overallFeedback?: string;
  totalWeightedScore?: number;
  isComplete?: boolean;
  evaluatedAt?: Date | null;
  interviewSessionId?: string | null;
  interviewerId?: string;
  interviewerName?: string;
}

export interface IDimensionEvaluationCriterionSnapshot {
  dimensionId: string;
  name: string;
  description: string;
  score: number;
  feedback?: string;
  reviewed?: boolean;
}

export interface IDimensionEvaluationSnapshot {
  path: string;
  dimensions: IDimensionEvaluationCriterionSnapshot[];
  overallFeedback?: string;
  evaluatedAt?: Date | null;
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
  appliedPath?: string | null;
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
  criteriaEvaluation?: ICriteriaEvaluationSnapshot;
  dimensionEvaluation?: any;
  
  createdAt: Date;
  updatedAt: Date;
}

export const CriterionEvaluationItemSchema: Schema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    weight: { type: Number, required: true, min: 1, max: 100 },
    rating: { type: Number, min: 1, max: 10, default: null },
    weightedScore: { type: Number, default: 0, min: 0, max: 100 },
    feedback: { type: String, default: "", trim: true },
    reviewed: { type: Boolean, default: false },
    dimensionId: { type: String, trim: true },
    score: { type: Number, min: 1, max: 10 },
  },
  { _id: false }
);

export const CriteriaEvaluationSchema: Schema = new Schema(
  {
    rubricVersion: { type: String, default: "nexus-interview-v2", trim: true },
    path: { type: String, required: true, trim: true },
    criteria: { type: [CriterionEvaluationItemSchema], default: [] },
    dimensions: { type: [CriterionEvaluationItemSchema], default: [] },
    overallFeedback: { type: String, default: "", trim: true },
    totalWeightedScore: { type: Number, default: 0 },
    isComplete: { type: Boolean, default: false },
    evaluatedAt: { type: Date, default: null },
    interviewSessionId: { type: String, default: null, trim: true },
    interviewerId: { type: String, default: "", trim: true },
    interviewerName: { type: String, default: "", trim: true },
  },
  { _id: false }
);

export const DimensionEvaluationItemSchema: Schema = new Schema(
  {
    dimensionId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    score: { type: Number, required: true, min: 1, max: 10 },
    feedback: { type: String, default: "", trim: true },
    reviewed: { type: Boolean, default: false },
  },
  { _id: false }
);

export const DimensionEvaluationSchema: Schema = new Schema(
  {
    path: { type: String, required: true, trim: true },
    dimensions: { type: [DimensionEvaluationItemSchema], default: [] },
    overallFeedback: { type: String, default: "", trim: true },
    evaluatedAt: { type: Date, default: null },
  },
  { _id: false }
);

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
    appliedPath: { type: String, default: null, trim: true },
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
    criteriaEvaluation: {
      type: CriteriaEvaluationSchema,
      required: false,
    },
    dimensionEvaluation: {
      type: Schema.Types.Mixed,
      required: false,
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
