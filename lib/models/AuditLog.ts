import mongoose, { Schema, model, models } from "mongoose";

export interface IAuditLog {
  id: string;
  familyGroupId?: string;
  actorUserId: string;
  actorName?: string;
  actorEmail?: string;
  targetUserId: string;
  targetProfileId: string;
  category: string;
  action: "view" | "create" | "update" | "delete" | "export";
  detail: string;
  ipAddress?: string;
  timestamp: number;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    id: { type: String, required: true, index: true },
    familyGroupId: { type: String, index: true },
    actorUserId: { type: String, required: true, index: true },
    actorName: { type: String },
    actorEmail: { type: String },
    targetUserId: { type: String, required: true, index: true },
    targetProfileId: { type: String, default: "myself", index: true },
    category: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: ["view", "create", "update", "delete", "export"],
      required: true,
      index: true,
    },
    detail: { type: String, required: true },
    ipAddress: { type: String },
    timestamp: { type: Number, default: Date.now, index: true },
  },
  { timestamps: true }
);

AuditLogSchema.index({ targetUserId: 1, timestamp: -1 });
AuditLogSchema.index({ familyGroupId: 1, timestamp: -1 });

const AuditLog = models.AuditLog || model<IAuditLog>("AuditLog", AuditLogSchema);
export default AuditLog;
