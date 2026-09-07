import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import HealthRecord from "@/lib/models/HealthRecord";
import SkinReport from "@/lib/models/SkinReport";
import LabReport from "@/lib/models/LabReport";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "health" | "skin" | "lab"
    const userId = searchParams.get("userId") || "guest";
    const dependentId = searchParams.get("dependentId") || "myself";
    const maxItems = Math.min(Number(searchParams.get("limit") || "20"), 50);

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({ reports: [], fallback: true });
    }

    const query: Record<string, any> = { userId };
    if (dependentId && dependentId !== "myself") {
      query.dependentId = dependentId;
    }

    let reports: any[] = [];
    if (type === "health") {
      reports = await HealthRecord.find(query).sort({ createdAt: -1 }).limit(maxItems).lean();
    } else if (type === "skin") {
      reports = await SkinReport.find(query).sort({ createdAt: -1 }).limit(maxItems).lean();
    } else if (type === "lab") {
      reports = await LabReport.find(query).sort({ createdAt: -1 }).limit(maxItems).lean();
    }

    return NextResponse.json({ reports });
  } catch (err) {
    console.error("GET /api/reports error:", err);
    return NextResponse.json({ reports: [], error: "Failed to load reports from MongoDB" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { type, record, userId, dependentId } = await req.json();

    if (!type || !record) {
      return NextResponse.json({ error: "Missing type or record" }, { status: 400 });
    }

    const targetUserId = userId || "guest";
    const targetDependentId = dependentId || "myself";

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({ success: true, savedToMongo: false, notice: "Local fallback mode." });
    }

    let savedRecord = null;
    if (type === "health") {
      savedRecord = await HealthRecord.create({
        ...record,
        userId: targetUserId,
        dependentId: targetDependentId,
      });
    } else if (type === "skin") {
      savedRecord = await SkinReport.create({
        ...record,
        userId: targetUserId,
        dependentId: targetDependentId,
      });
    } else if (type === "lab") {
      savedRecord = await LabReport.create({
        ...record,
        userId: targetUserId,
        dependentId: targetDependentId,
      });
    }

    return NextResponse.json({ success: true, savedToMongo: true, record: savedRecord });
  } catch (err) {
    console.error("POST /api/reports error:", err);
    return NextResponse.json({ error: "Failed to save report to MongoDB" }, { status: 500 });
  }
}
