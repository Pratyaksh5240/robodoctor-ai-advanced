import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import HealthRecord from "@/lib/models/HealthRecord";
import ChatMessage from "@/lib/models/ChatMessage";

export const runtime = "nodejs";

// GET /api/health-records?type=chats|records
export async function GET(request: NextRequest) {
  try {
    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json(
        { message: "MongoDB is not configured or available." },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "records";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (type === "chats") {
      const chats = await ChatMessage.find({})
        .sort({ createdAt: -1 })
        .limit(limit);
      return NextResponse.json({ success: true, count: chats.length, data: chats });
    }

    const records = await HealthRecord.find({})
      .sort({ createdAt: -1 })
      .limit(limit);
    return NextResponse.json({ success: true, count: records.length, data: records });
  } catch (error) {
    console.error("GET /api/health-records error:", error);
    return NextResponse.json(
      { error: "Failed to fetch records from MongoDB database." },
      { status: 500 }
    );
  }
}

// POST /api/health-records
export async function POST(request: NextRequest) {
  try {
    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json(
        { message: "MongoDB is not configured. Record created in local mode only." },
        { status: 200 }
      );
    }

    const body = await request.json();
    const newRecord = await HealthRecord.create(body);

    return NextResponse.json(
      { success: true, message: "Health record saved to MongoDB.", data: newRecord },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/health-records error:", error);
    return NextResponse.json(
      { error: "Failed to save health record to MongoDB." },
      { status: 500 }
    );
  }
}
