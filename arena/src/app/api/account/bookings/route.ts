import { NextRequest, NextResponse } from "next/server";

const keystoneApiUrl = process.env.NEXT_PUBLIC_KEYSTONE_API_URL as string;

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
  // Fetch enrollments for user and their dependents (in two steps)
  const query = `
    query GetUserAndDependents($userId: ID!) {
      user(where: { id: $userId }) {
        id
        name
        enrollments {
          id
          program { id name startDate endDate }
          participant { id name }
          dependent { id name }
          status
          enrolledAt
        }
        participantEnrollments {
          id
          program { id name startDate endDate }
          participant { id name }
          dependent { id name }
          status
          enrolledAt
        }
        dependents { id name }
      }
      facilityRentals(where: { customer: { id: { equals: $userId } } }) {
        id
        facility { id name }
        status
      }
    }
  `;
  const res = await fetch(keystoneApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `keystonejs-session=${session}`,
    },
    body: JSON.stringify({ query, variables: { userId } }),
  });
  const { data, errors } = await res.json();
  if (errors) {
    return NextResponse.json(
      { error: "Failed to fetch bookings", details: errors },
      { status: 500 }
    );
  }
  // Get dependent enrollments if there are dependents
  let dependentsWithEnrollments = [];
  const dependents = data.user?.dependents || [];
  if (dependents.length > 0) {
    const depIds = dependents.map((d: any) => d.id);
    const depEnrollmentsQuery = `
      query GetDependentEnrollments($depIds: [ID!]!) {
        enrollments(where: { dependent: { id: { in: $depIds } } }) {
          id
          program { id name startDate endDate }
          participant { id name }
          dependent { id name }
          status
          enrolledAt
        }
      }
    `;
    const depRes = await fetch(keystoneApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `keystonejs-session=${session}`,
      },
      body: JSON.stringify({
        query: depEnrollmentsQuery,
        variables: { depIds },
      }),
    });
    const { data: depData, errors: depErrors } = await depRes.json();

    if (depErrors) {
      return NextResponse.json(
        { error: "Failed to fetch dependent enrollments", details: depErrors },
        { status: 500 }
      );
    }
    // Group enrollments by dependent id
    dependentsWithEnrollments = dependents.map((dep: any) => ({
      id: dep.id,
      name: dep.name,
      enrollments: (depData.enrollments || []).filter(
        (e: any) => e.dependent?.id === dep.id
      ),
    }));
  }
  // Merge and deduplicate enrollments for user
  type Enrollment = {
    id: string;
    program: { id: string; name: string; startDate: string; endDate: string };
    participant: { id: string; name: string } | null;
    dependent: { id: string; name: string } | null;
    status: string;
    enrolledAt: string;
    participantType?: string;
    dependentName?: string;
  };
  const participantEnrollments: Enrollment[] = (
    data.user?.participantEnrollments || []
  ).map((e: Enrollment) => ({ ...e, participantType: "participant" }));
  return NextResponse.json({
    enrollments: participantEnrollments,
    rentals: data.facilityRentals || [],
  });
}
