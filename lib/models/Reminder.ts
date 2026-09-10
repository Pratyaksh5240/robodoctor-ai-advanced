import mongoose, { Schema, model, models } from "mongoose";

export interface IReminder {
  id: string;
  userId: string;
  dependentId?: string;
  title: string;
  time: string;
  dosage?: string;
  notificationEnabled: boolean;
  done: boolean;
  createdAt: number;
  genericName?: string;
  form?: "tablet" | "capsule" | "syrup" | "injection" | "inhaler" | "drops" | "cream" | "other" | string;
  instructions?: string;
  prescribingDoctor?: string;
  startDate?: string;
  endDate?: string;
  frequency?: string;
  times?: string[];
  status?: "active" | "paused" | "completed";
  source?: "manual" | "prescription_scan";
}

const ReminderSchema = new Schema<IReminder>(
  {
    id: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    dependentId: { type: String, default: "myself", index: true },
    title: { type: String, required: true },
    time: { type: String, required: true },
    dosage: { type: String },
    notificationEnabled: { type: Boolean, default: true },
    done: { type: Boolean, default: false },
    createdAt: { type: Number, default: Date.now },
    genericName: { type: String },
    form: { type: String, default: "tablet" },
    instructions: { type: String },
    prescribingDoctor: { type: String },
    startDate: { type: String },
    endDate: { type: String },
    frequency: { type: String },
    times: { type: [String], default: [] },
    status: { type: String, enum: ["active", "paused", "completed"], default: "active" },
    source: { type: String, enum: ["manual", "prescription_scan"], default: "manual" },
  },
  { timestamps: true }
);

const Reminder = models.Reminder || model<IReminder>("Reminder", ReminderSchema);
export default Reminder;

