import mongoose, { Schema, Document, Model } from "mongoose";

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

export interface IInterview extends Document {
  interviewSessionId?: string | null;
  applicantId: mongoose.Types.ObjectId;
  interviewerId: any;
  interviewerName?: string;
  clerkUserId?: string;
  eventId?: string;
  path?: string;
  roomNumber: number;
  status: "Waiting" | "Interviewing" | "Completed";
  ratings?: {
    technical?: number;
    communication?: number;
    confidence?: number;
    leadership?: number;
    teamwork?: number;
  };
  criteriaEvaluation?: ICriteriaEvaluationSnapshot;
  dimensionEvaluation?: any;
  notes: string;
  decision: "Approved" | "Pending" | "Discussion Needed";
  startTime?: Date;
  endTime?: Date;
  duration?: number; // in seconds
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

const DimensionEvaluationItemSchema: Schema = new Schema(
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

const DimensionEvaluationSchema: Schema = new Schema(
  {
    path: { type: String, required: true, trim: true },
    dimensions: { type: [DimensionEvaluationItemSchema], default: [] },
    overallFeedback: { type: String, default: "", trim: true },
    evaluatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const InterviewSchema: Schema = new Schema(
  {
    interviewSessionId: {
      type: String,
      trim: true,
    },
    applicantId: { type: Schema.Types.ObjectId, ref: "Applicant", required: true, index: true },
    interviewerId: { type: Schema.Types.Mixed, required: true },
    interviewerName: { type: String, default: "" },
    clerkUserId: { type: String, default: "", trim: true },
    eventId: { type: String, default: "", index: true },
    path: { type: String, default: "" },
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
    criteriaEvaluation: {
      type: CriteriaEvaluationSchema,
      required: false,
    },
    dimensionEvaluation: {
      type: Schema.Types.Mixed,
      required: false,
    },
    notes: { type: String, default: "" },
    decision: {
      type: String,
      enum: ["Approved", "Pending", "Discussion Needed"],
      required: true,
    },
    startTime: { type: Date },
    endTime: { type: Date },
    duration: { type: Number },
  },
  {
    timestamps: true,
  }
);

InterviewSchema.index(
  { interviewSessionId: 1 },
  { unique: true, partialFilterExpression: { interviewSessionId: { $type: "string" } } }
);

if (mongoose.models && mongoose.models.Interview) {
  delete mongoose.models.Interview;
}

const Interview: Model<IInterview> =
  mongoose.model<IInterview>("Interview", InterviewSchema);

export default Interview;
