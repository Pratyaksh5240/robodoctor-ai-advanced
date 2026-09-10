import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db/mongodb";
import FamilyGroup, { FamilyRole, HealthCategory } from "@/lib/models/FamilyGroup";
import Dependent from "@/lib/models/Dependent";
import AuditLog from "@/lib/models/AuditLog";

export interface SessionUser {
  uid: string;
  email: string;
  displayName?: string;
}

export type PermissionAction = "view" | "edit" | "admin";

/**
 * Extracts and validates the authenticated user from the robodoctor_session cookie.
 * Supports both Request headers and Next.js cookies().
 */
export async function getSessionUser(req?: Request): Promise<SessionUser | null> {
  try {
    let sessionRaw: string | undefined;

    if (req) {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/robodoctor_session=([^;]+)/);
      if (match && match[1]) {
        sessionRaw = decodeURIComponent(match[1]);
      }
    }

    if (!sessionRaw) {
      try {
        const cookieStore = await cookies();
        const cookie = cookieStore.get("robodoctor_session");
        if (cookie?.value) {
          sessionRaw = cookie.value;
        }
      } catch {
        // May fail if outside request context
      }
    }

    if (!sessionRaw) return null;

    const parsed = JSON.parse(sessionRaw) as SessionUser;
    if (parsed && typeof parsed.uid === "string" && parsed.uid.trim().length > 0) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

interface CheckAccessParams {
  sessionUser: SessionUser | null;
  targetUserId: string;
  targetProfileId?: string; // "myself" or dependentId
  category?: HealthCategory;
  action?: PermissionAction;
}

/**
 * Checks if the sessionUser has permission to access or modify records for targetUserId / targetProfileId.
 */
export async function checkProfileAccess({
  sessionUser,
  targetUserId,
  targetProfileId = "myself",
  category,
  action = "view",
}: CheckAccessParams): Promise<{ allowed: boolean; role?: FamilyRole | "Owner"; reason?: string }> {
  // 1. Guest access for offline/local demonstration mode
  if (!sessionUser || targetUserId === "guest" || targetUserId.startsWith("user_guest_")) {
    if (!sessionUser && targetUserId !== "guest" && !targetUserId.startsWith("user_guest_")) {
      return { allowed: false, reason: "Authentication required" };
    }
    return { allowed: true, role: "Owner" };
  }

  // 2. Direct Account Owner
  if (sessionUser.uid === targetUserId) {
    return { allowed: true, role: "Owner" };
  }

  await connectToDatabase();

  // 3. Managed Dependent belonging directly to sessionUser
  if (targetProfileId && targetProfileId !== "myself") {
    const ownedDependent = await Dependent.findOne({
      userId: sessionUser.uid,
      $or: [{ id: targetProfileId }, { _id: targetProfileId }],
    }).lean();
    if (ownedDependent) {
      return { allowed: true, role: "Owner" };
    }
  }

  // 4. Family Group Membership & Granular Permissions
  try {
    // Look for a family group that connects sessionUser and targetUserId
    const group = await FamilyGroup.findOne({
      $and: [
        {
          $or: [
            { ownerUserId: sessionUser.uid },
            { "members.userId": sessionUser.uid, "members.status": "active" },
          ],
        },
        {
          $or: [
            { ownerUserId: targetUserId },
            { "members.userId": targetUserId },
          ],
        },
      ],
    }).lean();

    if (!group) {
      return { allowed: false, reason: "No family sharing relationship found" };
    }

    // If sessionUser is the Owner of the group
    if (group.ownerUserId === sessionUser.uid) {
      return { allowed: true, role: "Owner" };
    }

    // Find member record for sessionUser
    const member = group.members?.find((m: any) => m.userId === sessionUser.uid && m.status === "active");
    if (!member) {
      return { allowed: false, reason: "Active family membership required" };
    }

    // Role-based baseline checks
    if (member.role === "Owner") {
      return { allowed: true, role: "Owner" };
    }

    if (action === "admin" && member.role !== "Owner" && member.role !== "Dependent manager") {
      return { allowed: false, reason: "Admin permission required" };
    }

    // Read-only clinician cannot edit or delete
    if (member.role === "Read-only clinician" && action !== "view") {
      return { allowed: false, reason: "Read-only clinician cannot modify records" };
    }

    // Check category-specific permissions if category is supplied
    if (category) {
      const permsMap = member.permissions;
      let allowedActions: string[] = [];

      if (permsMap instanceof Map) {
        allowedActions = permsMap.get(category) || [];
      } else if (permsMap && typeof permsMap === "object") {
        allowedActions = (permsMap as any)[category] || [];
      }

      if (allowedActions.includes(action) || allowedActions.includes("admin")) {
        return { allowed: true, role: member.role };
      }

      return {
        allowed: false,
        role: member.role,
        reason: `Insufficient permission for category '${category}' (${action})`,
      };
    }

    return { allowed: true, role: member.role };
  } catch (err) {
    console.error("checkProfileAccess error:", err);
    return { allowed: false, reason: "Permission evaluation error" };
  }
}

interface LogAuditParams {
  familyGroupId?: string;
  actorUserId: string;
  actorName?: string;
  actorEmail?: string;
  targetUserId: string;
  targetProfileId?: string;
  category: string;
  action: "view" | "create" | "update" | "delete" | "export";
  detail: string;
  ipAddress?: string;
}

/**
 * Asynchronously records a security/audit log event in MongoDB.
 */
export async function logAuditEvent(params: LogAuditParams): Promise<void> {
  try {
    await connectToDatabase();
    const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await AuditLog.create({
      id,
      familyGroupId: params.familyGroupId,
      actorUserId: params.actorUserId,
      actorName: params.actorName,
      actorEmail: params.actorEmail,
      targetUserId: params.targetUserId,
      targetProfileId: params.targetProfileId || "myself",
      category: params.category,
      action: params.action,
      detail: params.detail,
      ipAddress: params.ipAddress,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.warn("Failed to write audit log:", err);
  }
}
