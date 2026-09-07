import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import Streak from "@/lib/models/Streak";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const dependentId = searchParams.get("dependentId") || "myself";

    if (!userId || userId === "guest") {
      return NextResponse.json({ streak: null });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({ streak: null, fallback: true });
    }

    const streak = await Streak.findOne({ userId, dependentId }).lean();
    return NextResponse.json({ streak });
  } catch (err) {
    console.error("GET /api/streaks error:", err);
    return NextResponse.json({ streak: null }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, dependentId, streak } = await req.json();

    if (!userId || !streak) {
      return NextResponse.json({ error: "Missing userId or streak" }, { status: 400 });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({ success: true, savedToMongo: false });
    }

    const targetDependentId = dependentId || "myself";
    const updated = await Streak.findOneAndUpdate(
      { userId, dependentId: targetDependentId },
      { ...streak, userId, dependentId: targetDependentId, updatedAt: Date.now() },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, streak: updated, savedToMongo: true });
  } catch (err) {
    console.error("POST /api/streaks error:", err);
    return NextResponse.json({ error: "Failed to save streak" }, { status: 500 });
  }
}
