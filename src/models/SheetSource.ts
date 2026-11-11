import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISheetSource extends Document {
  name: string;
  spreadsheetId: string;
  url: string;
  sheetName?: string;
  range?: string;
  isActive: boolean;
  status: "Connected" | "Error" | "Never Tested";
  lastError?: string | null;
  lastTestedAt?: Date | null;
  lastLoadedAt?: Date | null;
  lastImportStats?: {
    totalRows: number;
    imported: number;
    updated: number;
    skipped: number;
    failed?: number;
  } | null;
  applicantCount?: number;
  isDefault?: boolean;
  isGloballyActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SheetSourceSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    spreadsheetId: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    sheetName: { type: String, default: "" },
    range: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["Connected", "Error", "Never Tested"],
      default: "Never Tested",
    },
    lastError: { type: String, default: null },
    lastTestedAt: { type: Date, default: null },
    lastLoadedAt: { type: Date, default: null },
    lastImportStats: {
      totalRows: { type: Number, default: 0 },
      imported: { type: Number, default: 0 },
      updated: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    applicantCount: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
    isGloballyActive: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models && mongoose.models.SheetSource) {
  delete mongoose.models.SheetSource;
}

const SheetSource: Model<ISheetSource> =
  mongoose.model<ISheetSource>("SheetSource", SheetSourceSchema);

export default SheetSource;

