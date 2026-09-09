import mongoose, { Schema, model, models } from "mongoose";

export interface IFamilyHistoryEntry {
  userId: string;
  dependentId?: string;
  relation: string;
  condition: string;
  ageOfOnset?: number | null;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

const FamilyHistoryEntrySchema = new Schema<IFamilyHistoryEntry>(
  {
    userId: { type: String, required: true, index: true },
    dependentId: { type: String, default: "myself", index: true },
    relation: { type: String, required: true, index: true },
    condition: { type: String, required: true },
    ageOfOnset: { type: Number, default: null },
    notes: { type: String, default: "" },
    createdAt: { type: Number, default: () => Date.now(), index: true },
    updatedAt: { type: Number, default: () => Date.now() },
  },
  { timestamps: true }
);

const FamilyHistoryEntry =
  models.FamilyHistoryEntry ||
  model<IFamilyHistoryEntry>("FamilyHistoryEntry", FamilyHistoryEntrySchema);

export default FamilyHistoryEntry;
