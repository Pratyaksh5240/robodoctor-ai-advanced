import mongoose, { Schema, model, models } from "mongoose";

export interface IHealthRecord {
  userId: string;
  dependentId?: string;
  createdAt: number;
  riskLevel: string;
  riskScore: number;
  summary: string;
  bp: string;
  sugar: string;
  heartRate: string;
  age?: number;
  gender?: string;
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  symptoms?: string;
  symptomTags?: string[];
}

const HealthRecordSchema = new Schema<IHealthRecord>(
  {
    userId: { type: String, required: true, index: true },
    dependentId: { type: String, default: "myself", index: true },
    createdAt: { type: Number, required: true, index: true },
    riskLevel: { type: String, required: true },
    riskScore: { type: Number, required: true },
    summary: { type: String, default: "" },
    bp: { type: String, default: "" },
    sugar: { type: String, default: "" },
    heartRate: { type: String, default: "" },
    age: { type: Number },
    gender: { type: String },
    heightCm: { type: Number },
    weightKg: { type: Number },
    bmi: { type: Number },
    symptoms: { type: String },
    symptomTags: [{ type: String }],
  },
  { timestamps: true }
);

const HealthRecord = models.HealthRecord || model<IHealthRecord>("HealthRecord", HealthRecordSchema);
export default HealthRecord;
