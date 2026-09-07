import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set("robodoctor_session", "", {
    httpOnly: false,
    maxAge: 0,
    path: "/",
  });
  return res;
}
