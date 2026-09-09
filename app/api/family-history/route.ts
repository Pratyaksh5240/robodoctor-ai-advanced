import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import FamilyHistoryEntry from "@/lib/models/FamilyHistoryEntry";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "guest";
    const dependentId = searchParams.get("dependentId") || "myself";

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({ entries: [], fallback: true });
    }

    const query: Record<string, any> = { userId };
    if (dependentId && dependentId !== "myself") {
      query.dependentId = dependentId;
    }

    const entries = await FamilyHistoryEntry.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ entries });
  } catch (err) {
    console.error("GET /api/family-history error:", err);
    return NextResponse.json({ entries: [], error: "Failed to load family history" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId, dependentId, entryId, data } = body;
    const targetUserId = userId || "guest";
    const targetDependentId = dependentId || "myself";

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({ success: true, savedToMongo: false, notice: "Offline fallback mode" });
    }

    if (action === "create") {
      const newEntry = await FamilyHistoryEntry.create({
        userId: targetUserId,
        dependentId: targetDependentId,
        relation: data.relation,
        condition: data.condition,
        ageOfOnset: data.ageOfOnset !== undefined && data.ageOfOnset !== null && data.ageOfOnset !== "" ? Number(data.ageOfOnset) : null,
        notes: data.notes || "",
      });
      return NextResponse.json({ success: true, entry: newEntry, savedToMongo: true });
    }

    if (action === "delete") {
      if (!entryId) {
        return NextResponse.json({ error: "Missing entryId" }, { status: 400 });
      }
      await FamilyHistoryEntry.deleteOne({ _id: entryId, userId: targetUserId });
      return NextResponse.json({ success: true, savedToMongo: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/family-history error:", err);
    return NextResponse.json({ error: "Failed to perform family history operation" }, { status: 500 });
  }
}
