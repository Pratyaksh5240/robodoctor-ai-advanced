import mongoose, { Schema, model, models } from "mongoose";

export interface IReminder {
  medicineName: string;
  dosage?: string;
  time: string;
  days?: string[];
  active?: boolean;
  notes?: string;
  pushSubscription?: object;
  createdAt?: Date;
  updatedAt?: Date;
}

const ReminderSchema = new Schema<IReminder>(
  {
    medicineName: { type: String, required: true },
    dosage: { type: String },
    time: { type: String, required: true },
    days: [{ type: String }],
    active: { type: Boolean, default: true },
    notes: { type: String },
    pushSubscription: { type: Object },
  },
  { timestamps: true }
);

const Reminder =
  models.Reminder || model<IReminder>("Reminder", ReminderSchema);

export default Reminder;
