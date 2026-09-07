import mongoose, { Schema, model, models } from "mongoose";

export interface ISkinReport {
  userId: string;
  dependentId?: string;
  createdAt: number;
  bodyPart: string;
  severity: string;
  score: number;
  summary: string;
  age?: number;
  gender?: string;
  symptoms?: string;
}

const SkinReportSchema = new Schema<ISkinReport>(
  {
    userId: { type: String, required: true, index: true },
    dependentId: { type: String, default: "myself", index: true },
    createdAt: { type: Number, required: true, index: true },
    bodyPart: { type: String, required: true },
    severity: { type: String, required: true },
    score: { type: Number, required: true },
    summary: { type: String, default: "" },
    age: { type: Number },
    gender: { type: String },
    symptoms: { type: String },
  },
  { timestamps: true }
);

const SkinReport = models.SkinReport || model<ISkinReport>("SkinReport", SkinReportSchema);
export default SkinReport;
