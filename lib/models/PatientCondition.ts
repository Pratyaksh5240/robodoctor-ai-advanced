import mongoose, { Schema, model, models } from "mongoose";

export interface IMedicationHistoryEntry {
  _id?: string;
  medicineName: string;
  dosage: string;
  startDate: string;
  endDate?: string | null;
  reasonForChange: string;
  prescribedBy?: string;
  createdAt: number;
}

export interface IPatientCondition {
  userId: string;
  dependentId?: string;
  name: string;
  diagnosedDate: string;
  status: "active" | "managed" | "resolved";
  notes?: string;
  medicationHistory: IMedicationHistoryEntry[];
  createdAt: number;
  updatedAt: number;
}

const MedicationHistorySchema = new Schema<IMedicationHistoryEntry>(
  {
    medicineName: { type: String, required: true },
    dosage: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, default: null },
    reasonForChange: { type: String, required: true },
    prescribedBy: { type: String, default: "" },
    createdAt: { type: Number, default: () => Date.now() },
  },
  { _id: true }
);

const PatientConditionSchema = new Schema<IPatientCondition>(
  {
    userId: { type: String, required: true, index: true },
    dependentId: { type: String, default: "myself", index: true },
    name: { type: String, required: true },
    diagnosedDate: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "managed", "resolved"],
      default: "active",
      required: true,
    },
    notes: { type: String, default: "" },
    medicationHistory: [MedicationHistorySchema],
    createdAt: { type: Number, default: () => Date.now(), index: true },
    updatedAt: { type: Number, default: () => Date.now() },
  },
  { timestamps: true }
);

const PatientCondition =
  models.PatientCondition ||
  model<IPatientCondition>("PatientCondition", PatientConditionSchema);

export default PatientCondition;
