import { NextResponse } from "next/server";

const keystoneApiUrl = process.env.NEXT_PUBLIC_KEYSTONE_API_URL as string;

export async function POST() {
  const query = `mutation { endSession }`;
  await fetch(keystoneApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  // Clear the session cookie
  const response = NextResponse.json({ success: true });
  response.cookies.set("keystonejs-session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    // secure: process.env.NODE_ENV === "production",
  });
  return response;
}
