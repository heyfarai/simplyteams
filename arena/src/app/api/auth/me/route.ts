import { NextRequest, NextResponse } from "next/server";

const keystoneApiUrl = process.env.NEXT_PUBLIC_KEYSTONE_API_URL as string;

export async function GET(req: NextRequest) {
  const session = req.cookies.get("keystonejs-session")?.value;
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  const query = `query { authenticatedItem { ... on User { id name email } } }`;
  const res = await fetch(keystoneApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `keystonejs-session=${session}`,
    },
    body: JSON.stringify({ query }),
  });
  const { data, errors } = await res.json();
  if (errors) {
    return NextResponse.json({ user: null, error: errors }, { status: 200 });
  }
  return NextResponse.json({ user: data.authenticatedItem || null });
}
