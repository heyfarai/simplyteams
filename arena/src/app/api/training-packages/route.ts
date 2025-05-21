import { NextRequest, NextResponse } from "next/server";

const keystoneApiUrl = process.env.NEXT_PUBLIC_KEYSTONE_API_URL as string;

export async function GET(req: NextRequest) {
  const query = `
    query {
      trainingPackages(where: { isActive: { equals: true } }) {
        id
        name
        description
        sessionCount
        price
      }
    }
  `;
  const res = await fetch(keystoneApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const { data, errors } = await res.json();
  if (errors) {
    return NextResponse.json(
      { error: "Failed to fetch training packages", details: errors },
      { status: 500 }
    );
  }
  return NextResponse.json({ trainingPackages: data.trainingPackages });
}
