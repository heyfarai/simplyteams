import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const date = searchParams.get("date");

  const where: Record<string, any> = {};
  if (type) {
    where.type = { equals: type };
  }
  if (date) {
    where.AND = [
      ...(where.AND || []),
      { isActive: { equals: true } },
      { startDate: { lte: date + "T23:59:59.999Z" } },
      { endDate: { gte: date + "T00:00:00.000Z" } },
    ];
  }

  const query = `
    query ($where: ProgramWhereInput) {
      programs(where: $where) {
        id
        name
        description
        type
        price
        dropInPrice
        allowDropIn
        startDate
        endDate
        facility {
          id
          name
        }
        daysOfWeek
        startTime
        endTime
      }
    }
  `;
  try {
    const res = await fetch(process.env.NEXT_PUBLIC_KEYSTONE_API_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { where } }),
    });
    const { data, errors } = await res.json();
    if (errors) {
      console.error("[programs API] GraphQL errors:", errors, "Where:", where);
      return NextResponse.json(
        { error: "Failed to fetch programs", details: errors },
        { status: 500 }
      );
    }
    return NextResponse.json({ programs: data.programs });
  } catch (err) {
    console.error("[programs API] Unexpected error:", err, "Where:", where);
    return NextResponse.json(
      { error: "Unexpected error fetching programs.", details: String(err) },
      { status: 500 }
    );
  }
}
