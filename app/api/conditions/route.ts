import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import PatientCondition from "@/lib/models/PatientCondition";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "guest";
    const dependentId = searchParams.get("dependentId") || "myself";

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({ conditions: [], fallback: true });
    }

    const query: Record<string, any> = { userId };
    if (dependentId && dependentId !== "myself") {
      query.dependentId = dependentId;
    }

    const conditions = await PatientCondition.find(query).sort({ updatedAt: -1 }).lean();
    return NextResponse.json({ conditions });
  } catch (err) {
    console.error("GET /api/conditions error:", err);
    return NextResponse.json({ conditions: [], error: "Failed to load conditions from MongoDB" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId, dependentId, conditionId, data } = body;
    const targetUserId = userId || "guest";
    const targetDependentId = dependentId || "myself";

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({ success: true, savedToMongo: false, notice: "Offline fallback mode" });
    }

    if (action === "create_condition") {
      const newCond = await PatientCondition.create({
        userId: targetUserId,
        dependentId: targetDependentId,
        name: data.name,
        diagnosedDate: data.diagnosedDate,
        status: data.status || "active",
        notes: data.notes || "",
        medicationHistory: data.medicationHistory || [],
      });
      return NextResponse.json({ success: true, condition: newCond, savedToMongo: true });
    }

    if (action === "add_medication_change") {
      if (!conditionId || !data) {
        return NextResponse.json({ error: "Missing conditionId or medication data" }, { status: 400 });
      }

      const updated = await PatientCondition.findOneAndUpdate(
        { _id: conditionId, userId: targetUserId },
        {
          $push: {
            medicationHistory: {
              medicineName: data.medicineName,
              dosage: data.dosage,
              startDate: data.startDate,
              endDate: data.endDate || null,
              reasonForChange: data.reasonForChange,
              prescribedBy: data.prescribedBy || "",
              createdAt: Date.now(),
            },
          },
          $set: { updatedAt: Date.now() },
        },
        { new: true }
      );

      return NextResponse.json({ success: true, condition: updated, savedToMongo: true });
    }

    if (action === "update_condition") {
      if (!conditionId) {
        return NextResponse.json({ error: "Missing conditionId" }, { status: 400 });
      }

      const updated = await PatientCondition.findOneAndUpdate(
        { _id: conditionId, userId: targetUserId },
        {
          $set: {
            name: data.name,
            diagnosedDate: data.diagnosedDate,
            status: data.status,
            notes: data.notes,
            updatedAt: Date.now(),
          },
        },
        { new: true }
      );

      return NextResponse.json({ success: true, condition: updated, savedToMongo: true });
    }

    if (action === "delete_condition") {
      if (!conditionId) {
        return NextResponse.json({ error: "Missing conditionId" }, { status: 400 });
      }
      await PatientCondition.deleteOne({ _id: conditionId, userId: targetUserId });
      return NextResponse.json({ success: true, savedToMongo: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/conditions error:", err);
    return NextResponse.json({ error: "Failed to perform condition operation" }, { status: 500 });
  }
}
