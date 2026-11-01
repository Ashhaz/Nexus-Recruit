import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEvaluationCriterion {
  id: string;
  name: string;
  maxScore: number;
}

export interface IEvaluationConfig extends Document {
  key: string;
  criteria: IEvaluationCriterion[];
  createdAt: Date;
  updatedAt: Date;
}

const EvaluationCriterionSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    maxScore: { type: Number, required: true, default: 10, min: 1 },
  },
  { _id: false }
);

const EvaluationConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    criteria: { type: [EvaluationCriterionSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models && mongoose.models.EvaluationConfig) {
  delete mongoose.models.EvaluationConfig;
}

const EvaluationConfig: Model<IEvaluationConfig> =
  mongoose.model<IEvaluationConfig>("EvaluationConfig", EvaluationConfigSchema);

export default EvaluationConfig;

