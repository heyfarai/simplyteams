import { NextResponse } from "next/server";

const keystoneApiUrl = process.env.NEXT_PUBLIC_KEYSTONE_API_URL as string;
const GLOBAL_OPEN_TIME = "08:00";
const GLOBAL_CLOSE_TIME = "22:00";
const GLOBAL_MIN_DURATION = 60;
const GLOBAL_MAX_DURATION = 60;

function parseTime(dateStr: string, timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCHours(h, m, 0, 0);
  return d;
}

function addMinutes(date: Date, mins: number) {
  return new Date(date.getTime() + mins * 60000);
}

function isClashing(
  start: Date,
  end: Date,
  bookings: { start: string; end: string }[]
) {
  return bookings.some(
    (b) => new Date(b.start) < end && new Date(b.end) > start
  );
}

export async function GET(
  req: Request,
  context: { params: { facilityId: string } }
) {
  const params = await context.params;
  const { facilityId } = params;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date"); // YYYY-MM-DD

  if (!date) {
    console.error("Missing date param");
    return NextResponse.json({ error: "Missing date param" }, { status: 400 });
  }
  if (!keystoneApiUrl) {
    console.error("Keystone API URL not set");
    return NextResponse.json(
      { error: "Keystone API URL not set" },
      { status: 500 }
    );
  }

  // 1. Fetch facility info, rentals, and sessions
  const query = `
    query($facilityId: ID!, $date: CalendarDay!, $dateStart: DateTime!, $dateEnd: DateTime!) {
      facility(where: { id: $facilityId }) {
        id
        openTime
        closeTime
        minBookingDurationMinutes
        maxBookingDurationMinutes
      }
      facilityRentals(where: {
        facility: { id: { equals: $facilityId } }
        OR: [
          { status: { equals: "confirmed" } },
          { status: { equals: "pending" }, holdExpiresAt: { gt: "${new Date().toISOString()}" } }
        ]
        startTime: { lt: $dateEnd }
        endTime: { gt: $dateStart }
      }) {
        id
        startTime
        endTime
      }
      sessions(where: {
        facility: { id: { equals: $facilityId } }
        date: { equals: $date }
      }) {
        id
        startTime
        endTime
      }
    }
  `;

  // Calculate date range for the day
  const dateStart = new Date(date + "T00:00:00Z").toISOString();
  const dateEnd = new Date(date + "T23:59:59Z").toISOString();

  const res = await fetch(keystoneApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      variables: { facilityId, date, dateStart, dateEnd },
    }),
  });
  const body = await res.text();

  if (!res.ok) {
    return NextResponse.json({ error: body }, { status: 500 });
  }
  const { data, errors } = JSON.parse(body);
  if (errors) {
    console.error("GraphQL errors:", errors);
    return NextResponse.json({ error: errors }, { status: 500 });
  }
  if (!data.facility) {
    console.error("Facility not found in Keystone response");
    return NextResponse.json({ error: "Facility not found" }, { status: 404 });
  }

  // 2. Determine open/close and duration
  const openTime = data.facility.openTime || GLOBAL_OPEN_TIME;
  const closeTime = data.facility.closeTime || GLOBAL_CLOSE_TIME;
  const minDuration =
    data.facility.minBookingDurationMinutes || GLOBAL_MIN_DURATION;
  const maxDuration =
    data.facility.maxBookingDurationMinutes || GLOBAL_MAX_DURATION;

  // 3. Gather all bookings (rentals + sessions)
  const bookings = [
    ...data.facilityRentals.map((r: any) => ({
      start: r.startTime,
      end: r.endTime,
    })),
    ...data.sessions.map((s: any) => ({ start: s.startTime, end: s.endTime })),
  ];

  // 4. Generate slots
  const open = parseTime(date, openTime);
  const close = parseTime(date, closeTime);
  const slots = [];
  let slotStart = new Date(open);
  while (addMinutes(slotStart, minDuration) <= close) {
    const slotEnd = addMinutes(slotStart, minDuration);
    if (!isClashing(slotStart, slotEnd, bookings)) {
      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
      });
    }
    slotStart = slotEnd;
  }
  return NextResponse.json({ slots });
}
