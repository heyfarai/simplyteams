import { NextRequest, NextResponse } from "next/server";

const keystoneApiUrl = process.env.NEXT_PUBLIC_KEYSTONE_API_URL as string;

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const session = req.cookies.get("keystonejs-session")?.value;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  // Get current user id
  const userQuery = `query { authenticatedItem { ... on User { id } } }`;
  const userRes = await fetch(keystoneApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `keystonejs-session=${session}`,
    },
    body: JSON.stringify({ query: userQuery }),
  });
  const userData = await userRes.json();
  const userId = userData?.data?.authenticatedItem?.id;
  if (!userId) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }
  // Create dependent
  const mutation = `mutation CreateDependent($name: String!, $userId: ID!) {
    createDependent(data: { name: $name, customer: { connect: { id: $userId } } }) {
      id
      name
    }
  }`;
  const res = await fetch(keystoneApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `keystonejs-session=${session}`,
    },
    body: JSON.stringify({ query: mutation, variables: { name, userId } }),
  });
  const { data, errors } = await res.json();
  if (errors) {
    return NextResponse.json(
      { error: "Failed to create dependent", details: errors },
      { status: 500 }
    );
  }
  return NextResponse.json({ dependent: data.createDependent });
}

export async function GET(req: NextRequest) {
  const session = req.cookies.get("keystonejs-session")?.value;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  // Get current user id
  const userQuery = `query { authenticatedItem { ... on User { id } } }`;
  const userRes = await fetch(keystoneApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `keystonejs-session=${session}`,
    },
    body: JSON.stringify({ query: userQuery }),
  });
  const userData = await userRes.json();
  const userId = userData?.data?.authenticatedItem?.id;
  if (!userId) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }
  // Fetch dependents
  const dependentsQuery = `
    query GetDependents($userId: ID!) {
      user(where: { id: $userId }) {
        dependents {
          id
          name
          enrollments: participantEnrollments {
            id
            program { id name startDate endDate }
            participant { id name }
            dependent { id name }
            session { id date startTime endTime }
            status
            enrolledAt
          }
        }
      }
    }
  `;
  const depRes = await fetch(keystoneApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `keystonejs-session=${session}`,
    },
    body: JSON.stringify({ query: dependentsQuery, variables: { userId } }),
  });
  const { data, errors } = await depRes.json();
  if (errors) {
    return NextResponse.json(
      { error: "Failed to fetch dependents", details: errors },
      { status: 500 }
    );
  }

  return NextResponse.json({ dependents: data.user?.dependents || [] });
}
