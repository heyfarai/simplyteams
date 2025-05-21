import { NextResponse } from "next/server";

const keystoneApiUrl = process.env.NEXT_PUBLIC_KEYSTONE_API_URL as string;

export async function GET() {
  if (!keystoneApiUrl) {
    return NextResponse.json(
      { error: "Keystone API URL not set" },
      { status: 500 }
    );
  }
  const query = `
    query {
      facilities(where: { bookable: { equals: true } }) {
        id
        name
        sport
        facilityType
        minBookingDurationMinutes
        maxBookingDurationMinutes
        openTime
        closeTime
      }
    }
  `;
  const res = await fetch(keystoneApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    return NextResponse.json({ error: errorText }, { status: 500 });
  }
  const { data, errors } = await res.json();
  if (errors) {
    return NextResponse.json({ error: errors }, { status: 500 });
  }
  return NextResponse.json({ facilities: data.facilities });
}
