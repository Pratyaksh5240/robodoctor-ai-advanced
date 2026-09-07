import mongoose, { Schema, model, models } from "mongoose";

export interface IUserProfile {
  userId: string;
  dependentId?: string;
  patientName?: string;
  age?: number;
  gender?: string;
  updatedAt: number;
}

const UserProfileSchema = new Schema<IUserProfile>(
  {
    userId: { type: String, required: true, index: true },
    dependentId: { type: String, default: "myself", index: true },
    patientName: { type: String },
    age: { type: Number },
    gender: { type: String },
    updatedAt: { type: Number, required: true },
  },
  { timestamps: true }
);

UserProfileSchema.index({ userId: 1, dependentId: 1 }, { unique: true });

const UserProfile = models.UserProfile || model<IUserProfile>("UserProfile", UserProfileSchema);
export default UserProfile;
