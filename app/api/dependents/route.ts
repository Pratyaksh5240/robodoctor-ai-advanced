import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import Dependent from "@/lib/models/Dependent";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId || userId === "guest") {
      return NextResponse.json({ dependents: [] });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({ dependents: [], fallback: true });
    }

    const dependents = await Dependent.find({ userId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({
      dependents: dependents.map((d: any) => ({
        id: d._id.toString(),
        name: d.name,
        relationship: d.relationship,
        age: d.age,
        gender: d.gender,
        createdAt: d.createdAt,
      })),
    });
  } catch (err) {
    console.error("GET /api/dependents error:", err);
    return NextResponse.json({ dependents: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, name, relationship, age, gender } = await req.json();

    if (!userId || !name || !relationship) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      const mockId = "dep_" + Date.now();
      return NextResponse.json({
        success: true,
        dependent: { id: mockId, name, relationship, age, gender, createdAt: Date.now() },
        savedToMongo: false,
      });
    }

    const newDep = await Dependent.create({
      userId,
      name,
      relationship,
      age: age ? Number(age) : undefined,
      gender,
      createdAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      dependent: {
        id: newDep._id.toString(),
        name: newDep.name,
        relationship: newDep.relationship,
        age: newDep.age,
        gender: newDep.gender,
        createdAt: newDep.createdAt,
      },
      savedToMongo: true,
    });
  } catch (err) {
    console.error("POST /api/dependents error:", err);
    return NextResponse.json({ error: "Failed to add dependent" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!id || !userId) {
      return NextResponse.json({ error: "Missing id or userId" }, { status: 400 });
    }

    const conn = await connectToDatabase();
    if (conn) {
      await Dependent.deleteOne({ _id: id, userId });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/dependents error:", err);
    return NextResponse.json({ error: "Failed to delete dependent" }, { status: 500 });
  }
}
