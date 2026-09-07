import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import UserProfile from "@/lib/models/UserProfile";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const dependentId = searchParams.get("dependentId") || "myself";

    if (!userId || userId === "guest") {
      return NextResponse.json({ profile: null });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({ profile: null, fallback: true });
    }

    const profile = await UserProfile.findOne({ userId, dependentId }).lean();
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("GET /api/profile error:", err);
    return NextResponse.json({ profile: null }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, dependentId, profile } = await req.json();

    if (!userId || userId === "guest") {
      return NextResponse.json({ success: true, profile });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({ success: true, savedToMongo: false, profile });
    }

    const targetDependentId = dependentId || "myself";
    const updated = await UserProfile.findOneAndUpdate(
      { userId, dependentId: targetDependentId },
      { ...profile, userId, dependentId: targetDependentId, updatedAt: Date.now() },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, savedToMongo: true, profile: updated });
  } catch (err) {
    console.error("POST /api/profile error:", err);
    return NextResponse.json({ error: "Failed to save profile to MongoDB" }, { status: 500 });
  }
}
