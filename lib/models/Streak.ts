import mongoose, { Schema, model, models } from "mongoose";

export interface IStreak {
  userId: string;
  dependentId?: string;
  currentStreak: number;
  longestStreak: number;
  lastLoggedDate: string; // YYYY-MM-DD
  updatedAt: number;
}

const StreakSchema = new Schema<IStreak>(
  {
    userId: { type: String, required: true, index: true },
    dependentId: { type: String, default: "myself", index: true },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastLoggedDate: { type: String, default: "" },
    updatedAt: { type: Number, default: Date.now },
  },
  { timestamps: true }
);

StreakSchema.index({ userId: 1, dependentId: 1 }, { unique: true });

const Streak = models.Streak || model<IStreak>("Streak", StreakSchema);
export default Streak;
