import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import User from "@/lib/models/User";
import {
  validateEmailFormat,
  verifyPassword,
  getUserRegistry,
} from "@/lib/authSecurity";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Both email and password are required to login." },
        { status: 400 }
      );
    }

    // 1. Strict Email Format & Domain Typo Detection
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

    // 3. Database & Local Store Authentication Check
    const conn = await connectToDatabase();
    let authenticatedUser: {
      uid: string;
      email: string;
      displayName: string;
      role?: string;
    } | null = null;

    if (conn) {
      const user = await User.findOne({ email: cleanEmail });
      if (user) {
        // Verify PBKDF2 password
        const passwordMatches = verifyPassword(password, user.salt, user.passwordHash);
        if (!passwordMatches) {
          return NextResponse.json(
            { error: "Incorrect password. Please verify your password and try again." },
            { status: 401 }
          );
        }

        authenticatedUser = {
          uid: user._id.toString(),
          email: user.email,
          displayName: user.displayName || user.email.split("@")[0],
        };
      }
    }

    // If not found in MongoDB or MongoDB not connected, check registered users / demo accounts
    if (!authenticatedUser) {
      const registry = getUserRegistry();
      const registeredUser = registry.get(cleanEmail);

      if (registeredUser) {
        const passwordMatches = verifyPassword(password, registeredUser.salt, registeredUser.passwordHash);
        if (!passwordMatches) {
          return NextResponse.json(
            { error: "Incorrect password. Please verify your password and try again." },
            { status: 401 }
          );
        }

        authenticatedUser = {
          uid: registeredUser.uid,
          email: registeredUser.email,
          displayName: registeredUser.displayName,
          role: registeredUser.role,
        };
      }
    }

    // 4. Strict Blocker: If account does NOT exist anywhere, reject securely!
    if (!authenticatedUser) {
      return NextResponse.json(
        {
          error: `No registered account found for "${cleanEmail}". Please click "Sign Up" below to create a new account, or use our official Demo credentials.`,
        },
        { status: 401 }
      );
    }

    // 5. Establish secure session cookie
    const res = NextResponse.json({
      success: true,
      user: authenticatedUser,
      message: "Login successful.",
    });

    res.cookies.set("robodoctor_session", JSON.stringify(authenticatedUser), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return res;
  } catch (err: unknown) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during login. Please try again." },
      { status: 500 }
    );
  }
}
