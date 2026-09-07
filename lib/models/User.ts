import mongoose, { Schema, model, models } from "mongoose";

export interface IUser {
  _id?: string;
  email: string;
  passwordHash: string;
  salt: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    salt: { type: String, required: true },
    displayName: { type: String, trim: true },
  },
  { timestamps: true }
);

const User = models.User || model<IUser>("User", UserSchema);
export default User;
