import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const programId = searchParams.get("programId");
  if (!programId) {
    return NextResponse.json({ error: "Missing programId" }, { status: 400 });
  }

  const query = `
    query ($where: SessionWhereInput) {
      sessions(where: $where, orderBy: { date: asc }) {
        id
        date
        startTime
        endTime
        dropInPrice
      }
    }
  `;
  const where = { program: { id: { equals: programId } } };
  try {
    const res = await fetch(process.env.NEXT_PUBLIC_KEYSTONE_API_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { where } }),
    });
    const { data, errors } = await res.json();
    if (errors) {
      console.error("[sessions API] GraphQL errors:", errors, "Where:", where);
      return NextResponse.json(
        { error: "Failed to fetch sessions", details: errors },
        { status: 500 }
      );
    }
    return NextResponse.json({ sessions: data.sessions });
  } catch (err) {
    console.error("[sessions API] Unexpected error:", err, "Where:", where);
    return NextResponse.json(
      { error: "Unexpected error fetching sessions.", details: String(err) },
      { status: 500 }
    );
  }
}
