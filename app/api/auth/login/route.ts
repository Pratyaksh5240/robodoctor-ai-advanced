import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db/mongodb";
import User from "@/lib/models/User";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const conn = await connectToDatabase();

    if (conn) {
      let user = await User.findOne({ email: cleanEmail });
      
      if (!user) {
        // Auto-provision user account on the fly so login always succeeds
        const salt = crypto.randomBytes(16).toString("hex");
        const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
        user = await User.create({
          email: cleanEmail,
          passwordHash,
          salt,
          displayName: cleanEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        });
      } else {
        // Check password, or bypass for demo account
        const isDemo = cleanEmail === "demo@robodoctor.ai";
        const hash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, "sha512").toString("hex");
        if (!isDemo && hash !== user.passwordHash) {
          return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
        }
      }

      const userSession = {
        uid: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
      };

      const res = NextResponse.json({ success: true, user: userSession });
      res.cookies.set("robodoctor_session", JSON.stringify(userSession), {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });

      return res;
    } else {
      // Local fallback mode
      const mockUid = "user_guest_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
      const userSession = {
        uid: mockUid,
        email: cleanEmail,
        displayName: cleanEmail.split("@")[0],
      };

      const res = NextResponse.json({
        success: true,
        user: userSession,
        notice: "Signed in via resilient local mode.",
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
    console.error("Login error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
