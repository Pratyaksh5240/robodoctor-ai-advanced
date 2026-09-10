import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db/mongodb";
import FamilyGroup, { FamilyRole, IFamilyMember } from "@/lib/models/FamilyGroup";
import FamilyInvitation from "@/lib/models/FamilyInvitation";
import AuditLog from "@/lib/models/AuditLog";
import User from "@/lib/models/User";
import { getSessionUser, logAuditEvent } from "@/lib/serverAuth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionUser = await getSessionUser(req);
    const userId = searchParams.get("userId") || sessionUser?.uid;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized or missing userId" }, { status: 401 });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({
        groups: [],
        invitations: [],
        auditLogs: [],
        fallback: true,
      });
    }

    // Find groups where user is owner or active member
    const groups = await FamilyGroup.find({
      $or: [
        { ownerUserId: userId },
        { "members.userId": userId, "members.status": "active" },
      ],
    }).lean();

    // Find pending invitations received by user's email or sent by user
    const userEmail = sessionUser?.email?.toLowerCase();
    const invitations = await FamilyInvitation.find({
      $or: [
        { inviterUserId: userId, status: "pending" },
        ...(userEmail ? [{ inviteeEmail: userEmail, status: "pending" }] : []),
      ],
    }).lean();

    // Find recent audit logs related to this user or their groups
    const groupIds = groups.map((g) => g.id);
    const auditLogs = await AuditLog.find({
      $or: [
        { actorUserId: userId },
        { targetUserId: userId },
        { familyGroupId: { $in: groupIds } },
      ],
    })
      .sort({ timestamp: -1 })
      .limit(30)
      .lean();

    return NextResponse.json({
      groups,
      invitations,
      auditLogs,
    });
  } catch (err) {
    console.error("GET /api/family-health error:", err);
    return NextResponse.json({ error: "Failed to fetch family health data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({ error: "Database not connected" }, { status: 503 });
    }

    // 1. CREATE FAMILY GROUP
    if (action === "create_group") {
      const { name } = body;
      if (!name?.trim()) {
        return NextResponse.json({ error: "Family group name is required" }, { status: 400 });
      }

      const groupId = `fam-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const ownerMember: IFamilyMember = {
        userId: sessionUser.uid,
        email: sessionUser.email,
        displayName: sessionUser.displayName || sessionUser.email.split("@")[0],
        role: "Owner",
        status: "active",
        permissions: {
          vitals: ["view", "edit", "admin"],
          skin: ["view", "edit", "admin"],
          medications: ["view", "edit", "admin"],
          adherence: ["view", "edit", "admin"],
          conditions: ["view", "edit", "admin"],
          family_pedigree: ["view", "edit", "admin"],
          lab_reports: ["view", "edit", "admin"],
          diet: ["view", "edit", "admin"],
          emergency_profile: ["view", "edit", "admin"],
          clinical_export: ["view", "edit", "admin"],
        },
        joinedAt: Date.now(),
      };

      const newGroup = await FamilyGroup.create({
        id: groupId,
        name: name.trim(),
        ownerUserId: sessionUser.uid,
        members: [ownerMember],
        createdAt: Date.now(),
      });

      void logAuditEvent({
        familyGroupId: groupId,
        actorUserId: sessionUser.uid,
        actorName: sessionUser.displayName,
        actorEmail: sessionUser.email,
        targetUserId: sessionUser.uid,
        category: "family_sharing",
        action: "create",
        detail: `Created family health group '${name.trim()}'`,
      });

      return NextResponse.json({ success: true, group: newGroup });
    }

    // 2. INVITE MEMBER
    if (action === "invite_member") {
      const { familyGroupId, inviteeEmail, role = "Adult member", permissions } = body;

      if (!familyGroupId || !inviteeEmail?.trim()) {
        return NextResponse.json({ error: "Missing groupId or inviteeEmail" }, { status: 400 });
      }

      const cleanEmail = inviteeEmail.toLowerCase().trim();

      const group = await FamilyGroup.findOne({ id: familyGroupId });
      if (!group) {
        return NextResponse.json({ error: "Family group not found" }, { status: 404 });
      }

      // Verify sessionUser is owner or has admin rights
      const senderMember = group.members.find((m: any) => m.userId === sessionUser.uid);
      if (group.ownerUserId !== sessionUser.uid && senderMember?.role !== "Owner") {
        return NextResponse.json({ error: "Only the group owner can invite members" }, { status: 403 });
      }

      // Generate 8-character invite code
      const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();
      const inviteId = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const invitation = await FamilyInvitation.create({
        id: inviteId,
        familyGroupId,
        familyGroupName: group.name,
        inviterUserId: sessionUser.uid,
        inviterName: sessionUser.displayName || sessionUser.email,
        inviteeEmail: cleanEmail,
        role,
        permissions: permissions || {
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
        },
        inviteCode,
        status: "pending",
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days expiry
        createdAt: Date.now(),
      });

      void logAuditEvent({
        familyGroupId,
        actorUserId: sessionUser.uid,
        actorName: sessionUser.displayName,
        actorEmail: sessionUser.email,
        targetUserId: cleanEmail,
        category: "family_sharing",
        action: "create",
        detail: `Sent invitation to ${cleanEmail} for role '${role}' (Invite code: ${inviteCode})`,
      });

      return NextResponse.json({ success: true, invitation });
    }

    // 3. ACCEPT INVITATION BY CODE
    if (action === "accept_invite") {
      const { inviteCode } = body;
      if (!inviteCode?.trim()) {
        return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
      }

      const cleanCode = inviteCode.trim().toUpperCase();
      const invite = await FamilyInvitation.findOne({
        inviteCode: cleanCode,
        status: "pending",
      });

      if (!invite) {
        return NextResponse.json({ error: "Invalid or expired invitation code" }, { status: 404 });
      }

      if (invite.expiresAt < Date.now()) {
        invite.status = "expired";
        await invite.save();
        return NextResponse.json({ error: "This invitation code has expired" }, { status: 410 });
      }

      const group = await FamilyGroup.findOne({ id: invite.familyGroupId });
      if (!group) {
        return NextResponse.json({ error: "Associated family group not found" }, { status: 404 });
      }

      // Check if already a member
      const existingMemberIndex = group.members.findIndex((m: any) => m.userId === sessionUser.uid);

      const newMember: IFamilyMember = {
        userId: sessionUser.uid,
        email: sessionUser.email,
        displayName: sessionUser.displayName || sessionUser.email.split("@")[0],
        role: invite.role as FamilyRole,
        status: "active",
        permissions: invite.permissions,
        joinedAt: Date.now(),
      };

      if (existingMemberIndex >= 0) {
        group.members[existingMemberIndex] = newMember;
      } else {
        group.members.push(newMember);
      }

      await group.save();

      invite.status = "accepted";
      await invite.save();

      void logAuditEvent({
        familyGroupId: group.id,
        actorUserId: sessionUser.uid,
        actorName: sessionUser.displayName,
        actorEmail: sessionUser.email,
        targetUserId: group.ownerUserId,
        category: "family_sharing",
        action: "update",
        detail: `${sessionUser.email} joined group '${group.name}' as '${invite.role}'`,
      });

      return NextResponse.json({ success: true, group });
    }

    // 4. UPDATE MEMBER PERMISSIONS & ROLE
    if (action === "update_permissions") {
      const { familyGroupId, targetUserId, role, permissions } = body;
      const group = await FamilyGroup.findOne({ id: familyGroupId });
      if (!group) {
        return NextResponse.json({ error: "Family group not found" }, { status: 404 });
      }

      if (group.ownerUserId !== sessionUser.uid) {
        return NextResponse.json({ error: "Only the group owner can update permissions" }, { status: 403 });
      }

      const member = group.members.find((m: any) => m.userId === targetUserId);
      if (!member) {
        return NextResponse.json({ error: "Member not found in group" }, { status: 404 });
      }

      if (role) member.role = role;
      if (permissions) member.permissions = permissions;

      await group.save();

      void logAuditEvent({
        familyGroupId: group.id,
        actorUserId: sessionUser.uid,
        actorName: sessionUser.displayName,
        actorEmail: sessionUser.email,
        targetUserId,
        category: "family_sharing",
        action: "update",
        detail: `Updated permissions/role for member ${member.email} to '${role || member.role}'`,
      });

      return NextResponse.json({ success: true, group });
    }

    // 5. REVOKE MEMBER ACCESS
    if (action === "revoke_member") {
      const { familyGroupId, targetUserId } = body;
      const group = await FamilyGroup.findOne({ id: familyGroupId });
      if (!group) {
        return NextResponse.json({ error: "Family group not found" }, { status: 404 });
      }

      if (group.ownerUserId !== sessionUser.uid && targetUserId !== sessionUser.uid) {
        return NextResponse.json({ error: "Unauthorized to revoke this member" }, { status: 403 });
      }

      if (targetUserId === group.ownerUserId) {
        return NextResponse.json({ error: "Cannot revoke the group owner" }, { status: 400 });
      }

      group.members = group.members.filter((m: any) => m.userId !== targetUserId);
      await group.save();

      void logAuditEvent({
        familyGroupId: group.id,
        actorUserId: sessionUser.uid,
        actorName: sessionUser.displayName,
        actorEmail: sessionUser.email,
        targetUserId,
        category: "family_sharing",
        action: "delete",
        detail: `Revoked access for user ID ${targetUserId} from group '${group.name}'`,
      });

      return NextResponse.json({ success: true, group });
    }

    // 6. CANCEL INVITATION
    if (action === "cancel_invite") {
      const { invitationId } = body;
      const invite = await FamilyInvitation.findOne({ id: invitationId });
      if (!invite) {
        return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
      }

      if (invite.inviterUserId !== sessionUser.uid) {
        return NextResponse.json({ error: "Unauthorized to cancel this invitation" }, { status: 403 });
      }

      invite.status = "revoked";
      await invite.save();

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error("POST /api/family-health error:", err);
    return NextResponse.json({ error: "Failed to process family request" }, { status: 500 });
  }
}
