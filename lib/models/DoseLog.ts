import mongoose, { Schema, model, models } from "mongoose";

export type DoseStatus =
  | "pending"
  | "taken"
  | "taken_late"
  | "missed"
  | "skipped"
  | "not_applicable";

export interface IDoseLog {
  id: string;
  reminderId: string;
  userId: string;
  dependentId: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:MM
  status: DoseStatus;
  recordedAt?: number;
  recordedBy?: string; // User ID or display name
  reason?: string; // e.g., "Side effects", "Felt better", "Forgot", "Doctor advised stop", "Ran out of medication"
  note?: string;
  createdAt: number;
}

const DoseLogSchema = new Schema<IDoseLog>(
  {
    id: { type: String, required: true, index: true },
    reminderId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    dependentId: { type: String, default: "myself", index: true },
    scheduledDate: { type: String, required: true, index: true },
    scheduledTime: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "taken", "taken_late", "missed", "skipped", "not_applicable"],
      default: "pending",
      index: true,
    },
    recordedAt: { type: Number },
    recordedBy: { type: String },
    reason: { type: String },
    note: { type: String },
    createdAt: { type: Number, default: Date.now },
  },
  { timestamps: true }
);

DoseLogSchema.index(
  { reminderId: 1, scheduledDate: 1, scheduledTime: 1 },
  { unique: true }
);

DoseLogSchema.index({ userId: 1, dependentId: 1, scheduledDate: 1 });

const DoseLog = models.DoseLog || model<IDoseLog>("DoseLog", DoseLogSchema);
export default DoseLog;
