import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import Reminder from "@/lib/models/Reminder";
import { getSessionUser, checkProfileAccess, logAuditEvent } from "@/lib/serverAuth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const dependentId = searchParams.get("dependentId") || "myself";

    if (!userId || userId === "guest") {
      return NextResponse.json({ reminders: [] });
    }

    const sessionUser = await getSessionUser(req);
    const access = await checkProfileAccess({
      sessionUser,
      targetUserId: userId,
      targetProfileId: dependentId,
      category: "medications",
      action: "view",
    });

    if (!access.allowed && userId !== "guest" && !userId.startsWith("user_guest_")) {
      return NextResponse.json({ reminders: [], fallback: true });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({ reminders: [], fallback: true });
    }

    const reminders = await Reminder.find({ userId, dependentId }).lean();
    return NextResponse.json({ reminders });
  } catch (err) {
    console.error("GET /api/reminders error:", err);
    return NextResponse.json({ reminders: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, dependentId, reminder } = await req.json();

    if (!userId || !reminder) {
      return NextResponse.json({ error: "Missing userId or reminder" }, { status: 400 });
    }

    const targetDependentId = dependentId || "myself";
    const sessionUser = await getSessionUser(req);
    const access = await checkProfileAccess({
      sessionUser,
      targetUserId: userId,
      targetProfileId: targetDependentId,
      category: "medications",
      action: "edit",
    });

    if (!access.allowed && userId !== "guest" && !userId.startsWith("user_guest_")) {
      return NextResponse.json({ error: access.reason || "Unauthorized" }, { status: 403 });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({ success: true, savedToMongo: false });
    }

    const updated = await Reminder.findOneAndUpdate(
      { id: String(reminder.id), userId },
      { ...reminder, id: String(reminder.id), userId, dependentId: targetDependentId },
      { upsert: true, new: true }
    );

    if (sessionUser) {
      void logAuditEvent({
        actorUserId: sessionUser.uid,
        actorName: sessionUser.displayName,
        actorEmail: sessionUser.email,
        targetUserId: userId,
        targetProfileId: targetDependentId,
        category: "medications",
        action: "create",
        detail: `Saved reminder for '${reminder.title}' at ${reminder.time || (reminder.times && reminder.times[0]) || "scheduled time"}`,
      });
    }

    return NextResponse.json({ success: true, reminder: updated, savedToMongo: true });
  } catch (err) {
    console.error("POST /api/reminders error:", err);
    return NextResponse.json({ error: "Failed to save reminder" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    const dependentId = searchParams.get("dependentId") || "myself";

    if (!id || !userId) {
      return NextResponse.json({ error: "Missing id or userId" }, { status: 400 });
    }

    const sessionUser = await getSessionUser(req);
    const access = await checkProfileAccess({
      sessionUser,
      targetUserId: userId,
      targetProfileId: dependentId,
      category: "medications",
      action: "edit",
    });

    if (!access.allowed && userId !== "guest" && !userId.startsWith("user_guest_")) {
      return NextResponse.json({ error: access.reason || "Unauthorized" }, { status: 403 });
    }

    const conn = await connectToDatabase();
    if (conn) {
      await Reminder.deleteOne({ id, userId });
    }

    if (sessionUser) {
      void logAuditEvent({
        actorUserId: sessionUser.uid,
        actorName: sessionUser.displayName,
        actorEmail: sessionUser.email,
        targetUserId: userId,
        targetProfileId: dependentId,
        category: "medications",
        action: "delete",
        detail: `Deleted medication reminder ID ${id}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/reminders error:", err);
    return NextResponse.json({ error: "Failed to delete reminder" }, { status: 500 });
  }
}

