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
  },
  { timestamps: true }
);

const Reminder = models.Reminder || model<IReminder>("Reminder", ReminderSchema);
export default Reminder;
