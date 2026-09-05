import mongoose, { Schema, model, models } from "mongoose";

export interface IHealthRecord {
  patientId?: string;
  age?: number;
  gender?: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  glucoseFasting?: number;
  oxygenSaturation?: number;
  symptoms?: string[];
  riskCategory?: "low" | "moderate" | "high" | "critical";
  riskScore?: number;
  recommendations?: string[];
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const HealthRecordSchema = new Schema<IHealthRecord>(
  {
    patientId: { type: String, index: true },
    age: { type: Number },
    gender: { type: String },
    bloodPressureSystolic: { type: Number },
    bloodPressureDiastolic: { type: Number },
    heartRate: { type: Number },
    glucoseFasting: { type: Number },
    oxygenSaturation: { type: Number },
    symptoms: [{ type: String }],
    riskCategory: {
      type: String,
      enum: ["low", "moderate", "high", "critical"],
      default: "low",
    },
    riskScore: { type: Number, default: 0 },
    recommendations: [{ type: String }],
    notes: { type: String },
  },
  { timestamps: true }
);

const HealthRecord =
  models.HealthRecord || model<IHealthRecord>("HealthRecord", HealthRecordSchema);

export default HealthRecord;
