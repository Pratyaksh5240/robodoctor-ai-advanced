import mongoose, { Schema, model, models } from "mongoose";

export type FamilyRole =
  | "Owner"
  | "Adult member"
  | "Caregiver"
  | "Dependent manager"
  | "Read-only clinician";

export type HealthCategory =
  | "vitals"
  | "skin"
  | "medications"
  | "adherence"
  | "conditions"
  | "family_pedigree"
  | "lab_reports"
  | "diet"
  | "emergency_profile"
  | "clinical_export";

export interface IFamilyMember {
  userId: string;
  email: string;
  displayName?: string;
  role: FamilyRole;
  status: "active" | "invited" | "revoked";
  permissions: Record<string, ("view" | "edit" | "admin")[]>;
  joinedAt: number;
}

export interface IFamilyGroup {
  id: string;
  name: string;
  ownerUserId: string;
  members: IFamilyMember[];
  createdAt: number;
}

const FamilyMemberSchema = new Schema<IFamilyMember>(
  {
    userId: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    displayName: { type: String },
    role: {
      type: String,
      enum: ["Owner", "Adult member", "Caregiver", "Dependent manager", "Read-only clinician"],
      required: true,
      default: "Adult member",
    },
    status: {
      type: String,
      enum: ["active", "invited", "revoked"],
      default: "active",
    },
    permissions: {
      type: Map,
      of: [String],
      default: () => ({
        vitals: ["view", "edit"],
        skin: ["view", "edit"],
        medications: ["view", "edit"],
        adherence: ["view", "edit"],
        conditions: ["view"],
        family_pedigree: ["view"],
        lab_reports: ["view"],
        diet: ["view"],
        emergency_profile: ["view"],
        clinical_export: ["view"],
      }),
    },
    joinedAt: { type: Number, default: Date.now },
  },
  { _id: false }
);

const FamilyGroupSchema = new Schema<IFamilyGroup>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    ownerUserId: { type: String, required: true, index: true },
    members: [FamilyMemberSchema],
    createdAt: { type: Number, default: Date.now },
  },
  { timestamps: true }
);

FamilyGroupSchema.index({ "members.userId": 1 });
FamilyGroupSchema.index({ "members.email": 1 });

const FamilyGroup = models.FamilyGroup || model<IFamilyGroup>("FamilyGroup", FamilyGroupSchema);
export default FamilyGroup;
