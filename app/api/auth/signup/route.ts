import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db/mongodb";
import User from "@/lib/models/User";

export async function POST(req: Request) {
  try {
    const { email, password, displayName } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const conn = await connectToDatabase();

    if (conn) {
      const existing = await User.findOne({ email: cleanEmail });
      if (existing) {
        return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
      }

      const salt = crypto.randomBytes(16).toString("hex");
      const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");

      const newUser = await User.create({
        email: cleanEmail,
        passwordHash,
        salt,
        displayName: displayName?.trim() || cleanEmail.split("@")[0],
      });

      const userSession = {
        uid: newUser._id.toString(),
        email: newUser.email,
        displayName: newUser.displayName,
      };

      const res = NextResponse.json({ success: true, user: userSession });
      res.cookies.set("robodoctor_session", JSON.stringify(userSession), {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });

      return res;
    } else {
      // Local/offline fallback mode when MongoDB URI is not yet configured
      const mockUid = "user_" + crypto.randomBytes(8).toString("hex");
      const userSession = {
        uid: mockUid,
        email: cleanEmail,
        displayName: displayName?.trim() || cleanEmail.split("@")[0],
      };

      const res = NextResponse.json({
        success: true,
        user: userSession,
        notice: "Account created in resilient local mode (MongoDB URI not configured).",
      });

      res.cookies.set("robodoctor_session", JSON.stringify(userSession), {
        httpOnly: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });

      return res;
    }
  } catch (err: unknown) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
