import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db/mongodb";
import User from "@/lib/models/User";
import {
  validateEmailFormat,
  hashPassword,
  getUserRegistry,
  StoredUser,
} from "@/lib/authSecurity";

export async function POST(req: Request) {
  try {
    const { email, password, displayName } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // 1. Strict RFC Email Format & Domain Typo Detection
    const validation = validateEmailFormat(email);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.error,
          suggestion: validation.suggestion,
        },
        { status: 400 }
      );
    }

    const cleanEmail = validation.cleanEmail;

    // 2. Minimum password length check
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const registry = getUserRegistry();
    const conn = await connectToDatabase();

    // 3. Check for existing user in MongoDB and in registry
    if (conn) {
      const existingInDb = await User.findOne({ email: cleanEmail });
      if (existingInDb) {
        return NextResponse.json(
          { error: "An account with this email address already exists. Please log in." },
          { status: 400 }
        );
      }
    }

    if (registry.has(cleanEmail)) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please log in." },
        { status: 400 }
      );
    }

    // 4. Secure PBKDF2 Password Hashing
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);
    const resolvedName = displayName?.trim() || cleanEmail.split("@")[0];

    let userSession: { uid: string; email: string; displayName: string };

    if (conn) {
      const newUser = await User.create({
        email: cleanEmail,
        passwordHash,
        salt,
        displayName: resolvedName,
      });

      userSession = {
        uid: newUser._id.toString(),
        email: newUser.email,
        displayName: newUser.displayName,
      };
    } else {
      const mockUid = "user_" + crypto.randomBytes(8).toString("hex");
      userSession = {
        uid: mockUid,
        email: cleanEmail,
        displayName: resolvedName,
      };
    }

    // Also register in local registry for persistent verification
    const storedUser: StoredUser = {
      uid: userSession.uid,
      email: cleanEmail,
      passwordHash,
      salt,
      displayName: resolvedName,
      role: "patient",
      createdAt: new Date().toISOString(),
    };
    registry.set(cleanEmail, storedUser);

    const res = NextResponse.json({
      success: true,
      user: userSession,
      message: "Account created successfully.",
    });

    res.cookies.set("robodoctor_session", JSON.stringify(userSession), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return res;
  } catch (err: unknown) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
