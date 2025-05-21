import { NextRequest, NextResponse } from "next/server";

const keystoneApiUrl = process.env.NEXT_PUBLIC_KEYSTONE_API_URL as string;

export async function POST(req: NextRequest) {
  const { items } = await req.json();
  const session = req.cookies.get("keystonejs-session")?.value;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "No items to book" }, { status: 400 });
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
  // For each item, create a booking (mock: create Enrollment for program, or FacilityRental for rental)
  const results = [];
  for (const item of items) {
    if (item.type === "program") {
      // Determine if participant is a user or dependent
      const isUser =
        item.participantId === userId ||
        (await fetch(keystoneApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `keystonejs-session=${session}`,
          },
          body: JSON.stringify({
            query: `query { user(where: { id: "${item.participantId}" }) { id } }`,
          }),
        })
          .then((res) => res.json())
          .then((data) => data.data?.user));

      // Dynamically build the data object
      const enrollmentData: {
        program: { connect: { id: string } };
        customer: { connect: { id: string } };
        status: string;
        participant?: { connect: { id: string } };
        dependent?: { connect: { id: string } };
      } = {
        program: { connect: { id: item.programId } },
        customer: { connect: { id: userId } },
        status: "confirmed",
      };
      if (isUser) {
        enrollmentData.participant = { connect: { id: item.participantId } };
      } else {
        enrollmentData.dependent = { connect: { id: item.participantId } };
      }
      const mutation = `mutation CreateEnrollment($data: EnrollmentCreateInput!) {
        createEnrollment(data: $data) {
          id
          program { id name }
          participant { id name }
          dependent { id name }
          status
          enrolledAt
        }
      }`;
      const res = await fetch(keystoneApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `keystonejs-session=${session}`,
        },
        body: JSON.stringify({
          query: mutation,
          variables: { data: enrollmentData },
        }),
      });
      const { data, errors } = await res.json();
      if (errors) {
        // Format the error message from Keystone
        const errorMessage =
          errors[0]?.message || "Failed to create enrollment";
        results.push({ error: { message: errorMessage } });
      } else if (!data?.createEnrollment) {
        results.push({ error: { message: "Failed to create enrollment" } });
      } else {
        results.push({ enrollment: data.createEnrollment });
      }
    } else if (item.type === "dropIn") {
      // Create Enrollment for drop-in session
      const isUser =
        item.participantId === userId ||
        (await fetch(keystoneApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `keystonejs-session=${session}`,
          },
          body: JSON.stringify({
            query: `query { user(where: { id: "${item.participantId}" }) { id } }`,
          }),
        })
          .then((res) => res.json())
          .then((data) => data.data?.user));

      const enrollmentData: {
        program: { connect: { id: string } };
        session: { connect: { id: string } };
        customer: { connect: { id: string } };
        status: string;
        participant?: { connect: { id: string } };
        dependent?: { connect: { id: string } };
      } = {
        program: { connect: { id: item.programId } },
        session: { connect: { id: item.sessionId } },
        customer: { connect: { id: userId } },
        status: "confirmed",
      };
      if (isUser) {
        enrollmentData.participant = { connect: { id: item.participantId } };
      } else {
        enrollmentData.dependent = { connect: { id: item.participantId } };
      }
      const mutation = `mutation CreateEnrollment($data: EnrollmentCreateInput!) {
        createEnrollment(data: $data) {
          id
          program { id name }
          session { id date startTime endTime }
          customer { id name }
          participant { id name }
          dependent { id name }
          status
          enrolledAt
        }
      }`;
      const res = await fetch(keystoneApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `keystonejs-session=${session}`,
        },
        body: JSON.stringify({
          query: mutation,
          variables: { data: enrollmentData },
        }),
      });
      const { data, errors } = await res.json();
      if (errors) {
        const errorMessage =
          errors[0]?.message || "Failed to create drop-in enrollment";
        console.error("Drop-in enrollment error:", errorMessage);
        results.push({ error: { message: errorMessage } });
      } else if (!data?.createEnrollment) {
        results.push({
          error: { message: "Failed to create drop-in enrollment" },
        });
      } else {
        console.log("Drop-in enrollment created:", data.createEnrollment);
        results.push({ enrollment: data.createEnrollment });
      }
    } else if (item.type === "rental") {
      // Create FacilityRental

      const mutation = `mutation CreateFacilityRental($facilityId: ID!, $customerId: ID!, $startTime: DateTime!, $endTime: DateTime!, $status: String!) {
        createFacilityRental(data: {
          facility: { connect: { id: $facilityId } },
          customer: { connect: { id: $customerId } },
          startTime: $startTime,
          endTime: $endTime,
          status: $status,
        }) {
          id
          facility { id name }
          startTime
          endTime
        }
      }`;
      const res = await fetch(keystoneApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `keystonejs-session=${session}`,
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            facilityId: item.facilityId,
            customerId: userId,
            startTime: item.start,
            endTime: item.end,
            status: "confirmed",
          },
        }),
      });
      const { data, errors } = await res.json();
      if (errors) {
        // Format the error message from Keystone
        const errorMessage = errors[0]?.message || "Failed to create rental";
        console.error("Rental creation error:", errorMessage);
        results.push({ error: { message: errorMessage } });
      } else if (!data?.createFacilityRental) {
        console.error("Rental creation failed: No data returned");
        results.push({ error: { message: "Failed to create rental" } });
      } else {
        console.log("Rental created successfully:", data.createFacilityRental);
        results.push({ rental: data.createFacilityRental });
      }
    }
  }
  return NextResponse.json({ results });
}
