import mongoose, { Schema, model, models } from "mongoose";

export interface IDependent {
  userId: string;
  name: string;
  relationship: string;
  age?: number;
  gender?: string;
  createdAt: number;
}

const DependentSchema = new Schema<IDependent>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    relationship: { type: String, required: true },
    age: { type: Number },
    gender: { type: String },
    createdAt: { type: Number, default: Date.now },
  },
  { timestamps: true }
);

const Dependent = models.Dependent || model<IDependent>("Dependent", DependentSchema);
export default Dependent;
