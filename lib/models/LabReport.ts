import mongoose, { Schema, model, models } from "mongoose";

export interface ILabReport {
  userId: string;
  dependentId?: string;
  createdAt: number;
  gender?: "male" | "female";
  fastingSugar?: string;
  hba1c?: string;
  hemoglobin?: string;
  tsh?: string;
  cholesterol?: string;
  creatinine?: string;
  platelets?: string;
  wbc?: string;
  overallStatus: string;
  summary: string;
  findingsCount: number;
}

const LabReportSchema = new Schema<ILabReport>(
  {
    userId: { type: String, required: true, index: true },
    dependentId: { type: String, default: "myself", index: true },
    createdAt: { type: Number, required: true, index: true },
    gender: { type: String, enum: ["male", "female"], default: "male" },
    fastingSugar: { type: String },
    hba1c: { type: String },
    hemoglobin: { type: String },
    tsh: { type: String },
    cholesterol: { type: String },
    creatinine: { type: String },
    platelets: { type: String },
    wbc: { type: String },
    overallStatus: { type: String, required: true },
    summary: { type: String, default: "" },
    findingsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const LabReport = models.LabReport || model<ILabReport>("LabReport", LabReportSchema);
export default LabReport;
