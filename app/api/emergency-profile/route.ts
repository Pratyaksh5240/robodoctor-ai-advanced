import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db/mongodb";
import EmergencyProfile from "@/lib/models/EmergencyProfile";
import { getSessionUser, checkProfileAccess, logAuditEvent } from "@/lib/serverAuth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId") || "myself";

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({ profile: null, fallback: true });
    }

    // 1. PUBLIC EMERGENCY RESPONDER ACCESS VIA TOKEN
    if (token) {
      const profile = await EmergencyProfile.findOne({
        "sharingSettings.publicToken": token,
        "sharingSettings.isPubliclyAccessibleViaEmergencyLink": true,
      }).lean();

      if (!profile) {
        return NextResponse.json({ error: "Emergency record not found or sharing disabled" }, { status: 404 });
      }

      // Filter attributes according to user's privacy toggles
      const filteredProfile = {
        patientName: profile.patientName,
        bloodGroup: profile.sharingSettings.showBloodGroup ? profile.bloodGroup : undefined,
        allergies: profile.sharingSettings.showAllergies ? profile.allergies : [],
        chronicConditions: profile.sharingSettings.showConditions ? profile.chronicConditions : [],
        currentEmergencyMeds: profile.sharingSettings.showMeds ? profile.currentEmergencyMeds : [],
        emergencyContacts: profile.sharingSettings.showContacts ? profile.emergencyContacts : [],
        hospitalPreference: profile.hospitalPreference,
        organDonor: profile.organDonor,
        specialMedicalNotes: profile.specialMedicalNotes,
        updatedAt: profile.updatedAt,
      };

      void logAuditEvent({
        actorUserId: "emergency_paramedic",
        actorName: "First Responder / Paramedic",
        targetUserId: profile.userId,
        targetProfileId: profile.profileId,
        category: "emergency_profile",
        action: "view",
        detail: "Emergency Medical Profile accessed via public token",
      });

      return NextResponse.json({ profile: filteredProfile, isPublicView: true });
    }

    // 2. AUTHENTICATED USER / FAMILY ACCESS
    if (!userId) {
      return NextResponse.json({ error: "Missing userId or token" }, { status: 400 });
    }

    const sessionUser = await getSessionUser(req);
    const access = await checkProfileAccess({
      sessionUser,
      targetUserId: userId,
      targetProfileId: profileId,
      category: "emergency_profile",
      action: "view",
    });

    if (!access.allowed) {
      return NextResponse.json({ error: access.reason || "Unauthorized" }, { status: 403 });
    }

    const profile = await EmergencyProfile.findOne({ userId, profileId }).lean();
    return NextResponse.json({ profile: profile || null });
  } catch (err) {
    console.error("GET /api/emergency-profile error:", err);
    return NextResponse.json({ error: "Failed to fetch emergency profile" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    const body = await req.json();
    const { userId, profileId = "myself", profileData } = body;

    if (!userId || !profileData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const access = await checkProfileAccess({
      sessionUser,
      targetUserId: userId,
      targetProfileId: profileId,
      category: "emergency_profile",
      action: "edit",
    });

    if (!access.allowed) {
      return NextResponse.json({ error: access.reason || "Unauthorized" }, { status: 403 });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({ success: true, savedToMongo: false });
    }

    // Generate publicToken if public link is enabled and no token exists
    let publicToken = profileData.sharingSettings?.publicToken;
    if (profileData.sharingSettings?.isPubliclyAccessibleViaEmergencyLink && !publicToken) {
      publicToken = crypto.randomBytes(8).toString("hex");
    }

    const updated = await EmergencyProfile.findOneAndUpdate(
      { userId, profileId },
      {
        ...profileData,
        userId,
        profileId,
        sharingSettings: {
          ...profileData.sharingSettings,
          publicToken,
        },
        updatedAt: Date.now(),
      },
      { upsert: true, new: true }
    );

    if (sessionUser) {
      void logAuditEvent({
        actorUserId: sessionUser.uid,
        actorName: sessionUser.displayName,
        actorEmail: sessionUser.email,
        targetUserId: userId,
        targetProfileId: profileId,
        category: "emergency_profile",
        action: "update",
        detail: `Updated emergency profile details and sharing settings`,
      });
    }

    return NextResponse.json({ success: true, profile: updated });
  } catch (err) {
    console.error("POST /api/emergency-profile error:", err);
    return NextResponse.json({ error: "Failed to save emergency profile" }, { status: 500 });
  }
}
