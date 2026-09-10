import mongoose, { Schema, model, models } from "mongoose";
import { FamilyRole } from "./FamilyGroup";

export interface IFamilyInvitation {
  id: string;
  familyGroupId: string;
  familyGroupName: string;
  inviterUserId: string;
  inviterName: string;
  inviteeEmail: string;
  role: FamilyRole;
  permissions: Record<string, ("view" | "edit" | "admin")[]>;
  inviteCode: string;
  status: "pending" | "accepted" | "declined" | "expired" | "revoked";
  expiresAt: number;
  createdAt: number;
}

const FamilyInvitationSchema = new Schema<IFamilyInvitation>(
  {
    id: { type: String, required: true, unique: true, index: true },
    familyGroupId: { type: String, required: true, index: true },
    familyGroupName: { type: String, required: true },
    inviterUserId: { type: String, required: true, index: true },
    inviterName: { type: String, required: true },
    inviteeEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: {
      type: String,
      enum: ["Owner", "Adult member", "Caregiver", "Dependent manager", "Read-only clinician"],
      default: "Adult member",
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
    inviteCode: { type: String, required: true, unique: true, index: true, uppercase: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "expired", "revoked"],
      default: "pending",
      index: true,
    },
    expiresAt: { type: Number, required: true },
    createdAt: { type: Number, default: Date.now },
  },
  { timestamps: true }
);

const FamilyInvitation =
  models.FamilyInvitation ||
  model<IFamilyInvitation>("FamilyInvitation", FamilyInvitationSchema);
export default FamilyInvitation;
