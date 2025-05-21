import fetch from "node-fetch";

const endpoint = "http://localhost:3000/api/graphql"; // Change port if needed

async function gql(query, variables = {}) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error(JSON.stringify(json.errors, null, 2));
    throw new Error("GraphQL error");
  }
  return json.data;
}

async function seed() {
  // 1. Facilities
  const facilities = {};
  const facilityData = [
    {
      name: "Full Court",
      sport: "basketball",
      facilityType: "full_court",
      minBookingDurationMinutes: 30,
      maxBookingDurationMinutes: 120,
      openTime: "08:00",
      closeTime: "22:00",
    },
    {
      name: "Half Court A (East)",
      sport: "basketball",
      facilityType: "half_court",
      minBookingDurationMinutes: 30,
      maxBookingDurationMinutes: 120,
      openTime: "08:00",
      closeTime: "22:00",
    },
    {
      name: "Half Court B (West)",
      sport: "basketball",
      facilityType: "half_court",
      minBookingDurationMinutes: 30,
      maxBookingDurationMinutes: 120,
      openTime: "08:00",
      closeTime: "22:00",
    },
    {
      name: "Individual Rim 1",
      sport: "basketball",
      facilityType: "rim",
      minBookingDurationMinutes: 30,
      maxBookingDurationMinutes: 60,
      openTime: "08:00",
      closeTime: "22:00",
    },
    {
      name: "Individual Rim 2",
      sport: "basketball",
      facilityType: "rim",
      minBookingDurationMinutes: 30,
      maxBookingDurationMinutes: 60,
      openTime: "08:00",
      closeTime: "22:00",
    },
    {
      name: "Pickleball Court 1",
      sport: "pickleball",
      facilityType: "court",
      minBookingDurationMinutes: 30,
      maxBookingDurationMinutes: 120,
      openTime: "08:00",
      closeTime: "22:00",
    },
    {
      name: "Pickleball Court 2",
      sport: "pickleball",
      facilityType: "court",
      minBookingDurationMinutes: 30,
      maxBookingDurationMinutes: 120,
      openTime: "08:00",
      closeTime: "22:00",
    },
    {
      name: "Soccer Field 1",
      sport: "soccer",
      facilityType: "field",
      minBookingDurationMinutes: 60,
      maxBookingDurationMinutes: 180,
      openTime: "08:00",
      closeTime: "22:00",
    },
    {
      name: "Soccer Field 2",
      sport: "soccer",
      facilityType: "field",
      minBookingDurationMinutes: 60,
      maxBookingDurationMinutes: 180,
      openTime: "08:00",
      closeTime: "22:00",
    },
    {
      name: "Tennis Court 1",
      sport: "tennis",
      facilityType: "court",
      minBookingDurationMinutes: 30,
      maxBookingDurationMinutes: 120,
      openTime: "08:00",
      closeTime: "22:00",
    },
    {
      name: "Tennis Court 2",
      sport: "tennis",
      facilityType: "court",
      minBookingDurationMinutes: 30,
      maxBookingDurationMinutes: 120,
      openTime: "08:00",
      closeTime: "22:00",
    },
    {
      name: "Volleyball Court",
      sport: "volleyball",
      facilityType: "court",
      minBookingDurationMinutes: 30,
      maxBookingDurationMinutes: 120,
      openTime: "08:00",
      closeTime: "22:00",
    },
  ];

  for (const facility of facilityData) {
    const { createFacility } = await gql(
      `
      mutation ($data: FacilityCreateInput!) {
        createFacility(data: $data) { id name sport facilityType }
      }
    `,
      { data: facility }
    );
    facilities[facility.name] = createFacility;
  }

  // 2. Users
  const users = {};
  for (const user of [
    {
      name: "Admin User",
      email: "admin@example.com",
      password: "password123",
      role: "ADMIN",
      tShirtFit: "male",
      tShirtSize: "adult_l",
    },
    {
      name: "Coach Carter",
      email: "coach@example.com",
      password: "password123",
      role: "COACH",
      tShirtFit: "male",
      tShirtSize: "adult_m",
    },
    {
      name: "Jane Customer",
      email: "jane@example.com",
      password: "password123",
      role: "CUSTOMER",
      tShirtFit: "female",
      tShirtSize: "adult_s",
    },
  ]) {
    // Check if user exists by email
    const query = `
      query ($email: String!) {
        users(where: { email: { equals: $email } }) { id name email role }
      }
    `;
    const found = await gql(query, { email: user.email });
    let userObj;
    if (found.users && found.users.length > 0) {
      userObj = found.users[0];
    } else {
      const { createUser } = await gql(
        `
        mutation ($data: UserCreateInput!) {
          createUser(data: $data) { id name email role }
        }
      `,
        { data: user }
      );
      userObj = createUser;
    }
    users[user.role] = userObj;
  }

  // 3. Dependent
  const { createDependent } = await gql(
    `
    mutation ($data: DependentCreateInput!) {
      createDependent(data: $data) { id name }
    }
  `,
    {
      data: {
        name: "Little Customer",
        dateOfBirth: "2015-06-01",
        customer: { connect: { id: users.CUSTOMER.id } },
        tShirtFit: "female",
        tShirtSize: "youth_s",
      },
    }
  );

  // 4. Waiver
  const { createWaiver } = await gql(
    `
    mutation ($data: WaiverCreateInput!) {
      createWaiver(data: $data) { id title }
    }
  `,
    {
      data: {
        title: "General Liability Waiver",
        text: "By participating, you agree to the terms...",
        version: "1.0",
      },
    }
  );

  // 5. Waiver Acceptance
  await gql(
    `
    mutation ($data: WaiverAcceptanceCreateInput!) {
      createWaiverAcceptance(data: $data) { id }
    }
  `,
    {
      data: {
        waiver: { connect: { id: createWaiver.id } },
        customer: { connect: { id: users.CUSTOMER.id } },
        acceptedAt: new Date().toISOString(),
      },
    }
  );

  // 6. Program
  const now = new Date();
  const inAWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const { createProgram } = await gql(
    `
    mutation ($data: ProgramCreateInput!) {
      createProgram(data: $data) { id name }
    }
  `,
    {
      data: {
        name: "Summer Basketball Camp",
        description: "A fun camp for all ages.",
        type: "camp",
        startDate: now.toISOString(),
        endDate: inAWeek.toISOString(),
        startTime: now.toISOString(),
        endTime: now.toISOString(),
        daysOfWeek: ["mon", "wed", "fri"],
        capacity: 30,
        price: 100,
        isActive: true,
        facility: { connect: { id: facilities["Full Court"].id } },
        enrollmentStartDate: now.toISOString(),
        enrollmentEndDate: inThreeDays.toISOString(),
        status: "upcoming",
        instructors: { connect: [{ id: users.COACH.id }] },
      },
    }
  );

  // 7. Enrollment
  await gql(
    `
    mutation ($data: EnrollmentCreateInput!) {
      createEnrollment(data: $data) { id }
    }
  `,
    {
      data: {
        program: { connect: { id: createProgram.id } },
        customer: { connect: { id: users.CUSTOMER.id } },
        participant: { connect: { id: users.CUSTOMER.id } },
        status: "confirmed",
        enrolledAt: now.toISOString(),
      },
    }
  );

  // 8. Facility Rental
  const { createFacilityRental } = await gql(
    `
    mutation ($data: FacilityRentalCreateInput!) {
      createFacilityRental(data: $data) { id }
    }
    `,
    {
      data: {
        facility: { connect: { id: facilities["Full Court"].id } },
        customer: { connect: { id: users.CUSTOMER.id } },
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour later
        status: "confirmed",
      },
    }
  );

  // 9. Additional Enrollments (10 total)
  const enrollments = [];
  for (let i = 0; i < 7; i++) {
    const { createEnrollment } = await gql(
      `
      mutation ($data: EnrollmentCreateInput!) {
        createEnrollment(data: $data) { id participant { id name } dependent { id name } }
      }
      `,
      {
        data: {
          program: { connect: { id: createProgram.id } },
          customer: { connect: { id: users.CUSTOMER.id } },
          participant: { connect: { id: users.CUSTOMER.id } },
          status: "confirmed",
          enrolledAt: new Date(Date.now() - i * 86400000).toISOString(),
        },
      }
    );
    enrollments.push(createEnrollment);
  }
  for (let i = 0; i < 3; i++) {
    const { createEnrollment } = await gql(
      `
      mutation ($data: EnrollmentCreateInput!) {
        createEnrollment(data: $data) { id participant { id name } dependent { id name } }
      }
      `,
      {
        data: {
          program: { connect: { id: createProgram.id } },
          customer: { connect: { id: users.CUSTOMER.id } },
          dependent: { connect: { id: createDependent.id } },
          status: "confirmed",
          enrolledAt: new Date(Date.now() - (i + 7) * 86400000).toISOString(),
        },
      }
    );
    enrollments.push(createEnrollment);
  }

  // 10. Additional Rentals (3 total)
  const rentalTimes = [
    [1, 2],
    [3, 4],
    [5, 6],
  ];
  const rentalFacilities = [
    facilities["Half Court A (East)"],
    facilities["Half Court B (West)"],
    facilities["Pickleball Court 1"],
  ];
  const rentals = [];
  for (let i = 0; i < 3; i++) {
    const start = new Date(Date.now() + rentalTimes[i][0] * 3600000);
    const end = new Date(Date.now() + rentalTimes[i][1] * 3600000);
    const { createFacilityRental } = await gql(
      `
      mutation ($data: FacilityRentalCreateInput!) {
        createFacilityRental(data: $data) { id facility { id name } startTime endTime }
      }
      `,
      {
        data: {
          facility: { connect: { id: rentalFacilities[i].id } },
          customer: { connect: { id: users.CUSTOMER.id } },
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          status: "confirmed",
        },
      }
    );
    rentals.push(createFacilityRental);
  }

  // 11. Payments (3 total)
  const payments = [];
  for (let i = 0; i < 3; i++) {
    const { createPayment } = await gql(
      `
      mutation ($data: PaymentCreateInput!) {
        createPayment(data: $data) { id amount status stripePaymentIntentId customer { id name } }
      }
      `,
      {
        data: {
          amount: 100 + i * 50,
          status: "completed",
          stripePaymentIntentId: `pi_test_${i}`,
          customer: { connect: { id: users.CUSTOMER.id } },
        },
      }
    );
    payments.push(createPayment);
  }

  // 12. Invoices (3 total, linked to payments)
  const invoices = [];
  for (let i = 0; i < 3; i++) {
    const { createInvoice } = await gql(
      `
      mutation ($data: InvoiceCreateInput!) {
        createInvoice(data: $data) { id amount status payment { id } customer { id name } }
      }
      `,
      {
        data: {
          amount: payments[i].amount,
          status: "paid",
          payment: { connect: { id: payments[i].id } },
          customer: { connect: { id: users.CUSTOMER.id } },
        },
      }
    );
    invoices.push(createInvoice);
  }

  // 13. Additional Programs: Bitty Ballers & March Break Camp
  const { createProgram: bittyBallers } = await gql(
    `
    mutation ($data: ProgramCreateInput!) {
      createProgram(data: $data) { id name }
    }
    `,
    {
      data: {
        name: "Bitty Ballers",
        description: "Introductory basketball for young kids.",
        type: "clinic",
        startDate: new Date(
          Date.now() + 10 * 24 * 60 * 60 * 1000
        ).toISOString(),
        endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        startTime: new Date(
          Date.now() + 10 * 24 * 60 * 60 * 1000
        ).toISOString(),
        endTime: new Date(
          Date.now() + 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
        ).toISOString(),
        daysOfWeek: ["sat", "sun"],
        capacity: 20,
        price: 60,
        isActive: true,
        facility: { connect: { id: facilities["Half Court A (East)"].id } },
        enrollmentStartDate: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        enrollmentEndDate: new Date(
          Date.now() + 9 * 24 * 60 * 60 * 1000
        ).toISOString(),
        status: "upcoming",
        instructors: { connect: [{ id: users.COACH.id }] },
      },
    }
  );
  const { createProgram: marchBreakCamp } = await gql(
    `
    mutation ($data: ProgramCreateInput!) {
      createProgram(data: $data) { id name }
    }
    `,
    {
      data: {
        name: "March Break Camp",
        description: "A fun camp for March break.",
        type: "camp",
        startDate: new Date(
          Date.now() + 20 * 24 * 60 * 60 * 1000
        ).toISOString(),
        endDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
        startTime: new Date(
          Date.now() + 20 * 24 * 60 * 60 * 1000
        ).toISOString(),
        endTime: new Date(
          Date.now() + 20 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000
        ).toISOString(),
        daysOfWeek: ["mon", "tue", "wed", "thu", "fri"],
        capacity: 40,
        price: 150,
        isActive: true,
        facility: { connect: { id: facilities["Full Court"].id } },
        enrollmentStartDate: new Date(
          Date.now() + 17 * 24 * 60 * 60 * 1000
        ).toISOString(),
        enrollmentEndDate: new Date(
          Date.now() + 19 * 24 * 60 * 60 * 1000
        ).toISOString(),
        status: "upcoming",
        instructors: { connect: [{ id: users.COACH.id }] },
      },
    }
  );

  // Enrollments for Bitty Ballers
  for (let i = 0; i < 2; i++) {
    await gql(
      `
      mutation ($data: EnrollmentCreateInput!) {
        createEnrollment(data: $data) { id }
      }
      `,
      {
        data: {
          program: { connect: { id: bittyBallers.id } },
          customer: { connect: { id: users.CUSTOMER.id } },
          participant: { connect: { id: users.CUSTOMER.id } },
          status: "confirmed",
          enrolledAt: new Date(Date.now() + (10 + i) * 86400000).toISOString(),
        },
      }
    );
  }
  // Enrollments for March Break Camp
  for (let i = 0; i < 3; i++) {
    await gql(
      `
      mutation ($data: EnrollmentCreateInput!) {
        createEnrollment(data: $data) { id }
      }
      `,
      {
        data: {
          program: { connect: { id: marchBreakCamp.id } },
          customer: { connect: { id: users.CUSTOMER.id } },
          participant: { connect: { id: users.CUSTOMER.id } },
          status: "confirmed",
          enrolledAt: new Date(Date.now() + (20 + i) * 86400000).toISOString(),
        },
      }
    );
  }

  // 14. Training Packages (12, 8, 4, 1 session)
  const trainingPackages = [];
  const packageOptions = [
    { name: "12 Session Pack", sessionCount: 12, price: 900 },
    { name: "8 Session Pack", sessionCount: 8, price: 640 },
    { name: "4 Session Pack", sessionCount: 4, price: 340 },
    { name: "Single Session", sessionCount: 1, price: 90 },
  ];
  for (const pkg of packageOptions) {
    const { createTrainingPackage } = await gql(
      `
      mutation ($data: TrainingPackageCreateInput!) {
        createTrainingPackage(data: $data) { id name sessionCount price }
      }
      `,
      {
        data: {
          name: pkg.name,
          description: `${pkg.sessionCount} private skills sessions`,
          sessionCount: pkg.sessionCount,
          price: pkg.price,
          isActive: true,
        },
      }
    );
    trainingPackages.push(createTrainingPackage);
  }

  // 15. Purchased Packages (for user and dependent)
  const purchasedPackages = [];
  // User buys 12-pack
  const { createPurchasedPackage: userPurchased } = await gql(
    `
    mutation ($data: PurchasedPackageCreateInput!) {
      createPurchasedPackage(data: $data) { id sessionsRemaining sessionsUsed package { id name } customer { id name } }
    }
    `,
    {
      data: {
        package: { connect: { id: trainingPackages[0].id } },
        customer: { connect: { id: users.CUSTOMER.id } },
        sessionsRemaining: 12,
        sessionsUsed: 0,
        purchasedAt: new Date().toISOString(),
      },
    }
  );
  purchasedPackages.push(userPurchased);
  // Dependent buys 4-pack
  const { createPurchasedPackage: depPurchased } = await gql(
    `
    mutation ($data: PurchasedPackageCreateInput!) {
      createPurchasedPackage(data: $data) { id sessionsRemaining sessionsUsed package { id name } dependent { id name } }
    }
    `,
    {
      data: {
        package: { connect: { id: trainingPackages[2].id } },
        dependent: { connect: { id: createDependent.id } },
        sessionsRemaining: 4,
        sessionsUsed: 0,
        purchasedAt: new Date().toISOString(),
      },
    }
  );
  purchasedPackages.push(depPurchased);

  // 16. Training Sessions (linked to purchased packages)
  const trainingSessions = [];
  // 2 sessions for user, 1 for dependent
  for (let i = 0; i < 2; i++) {
    const { createTrainingSession } = await gql(
      `
      mutation ($data: TrainingSessionCreateInput!) {
        createTrainingSession(data: $data) { id startTime endTime coach { id name } customer { id name } facility { id name } status }
      }
      `,
      {
        data: {
          purchasedPackage: { connect: { id: userPurchased.id } },
          coach: { connect: { id: users.COACH.id } },
          customer: { connect: { id: users.CUSTOMER.id } },
          facility: { connect: { id: facilities["Full Court"].id } },
          scheduledAt: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
          startTime: new Date(
            Date.now() + (i + 1) * 86400000 + 9 * 3600000
          ).toISOString(),
          endTime: new Date(
            Date.now() + (i + 1) * 86400000 + 10 * 3600000
          ).toISOString(),
          status: "scheduled",
        },
      }
    );
    trainingSessions.push(createTrainingSession);
  }
  // 1 session for dependent
  const { createTrainingSession: depSession } = await gql(
    `
    mutation ($data: TrainingSessionCreateInput!) {
      createTrainingSession(data: $data) { id startTime endTime coach { id name } dependent { id name } facility { id name } status }
    }
    `,
    {
      data: {
        purchasedPackage: { connect: { id: depPurchased.id } },
        coach: { connect: { id: users.COACH.id } },
        dependent: { connect: { id: createDependent.id } },
        facility: { connect: { id: facilities["Half Court B (West)"].id } },
        scheduledAt: new Date(Date.now() + 3 * 86400000).toISOString(),
        startTime: new Date(
          Date.now() + 3 * 86400000 + 11 * 3600000
        ).toISOString(),
        endTime: new Date(
          Date.now() + 3 * 86400000 + 12 * 3600000
        ).toISOString(),
        status: "scheduled",
      },
    }
  );
  trainingSessions.push(depSession);

  // 15. Open Gym Programs (Tuesday & Thursday) with drop-in enabled
  const { createProgram: openGymTuesday } = await gql(
    `
    mutation ($data: ProgramCreateInput!) {
      createProgram(data: $data) { id name type facility { id name } allowDropIn dropInPrice }
    }
    `,
    {
      data: {
        name: "Open Gym (Tuesday Night)",
        description: "Drop-in open gym session on Tuesday nights.",
        type: "open_gym",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(), // 90 days from now
        capacity: 30,
        price: 10,
        allowDropIn: true,
        dropInPrice: 12,
        isActive: true,
        isVisible: true,
        daysOfWeek: ["tue"],
        startTime: new Date(new Date().setHours(19, 0, 0, 0)).toISOString(),
        endTime: new Date(new Date().setHours(22, 0, 0, 0)).toISOString(),
        facility: { connect: { id: facilities["Full Court"].id } },
      },
    }
  );
  // Set dropInPrice for a specific session
  const { createSession: openGymSession1 } = await gql(
    `
    mutation ($data: SessionCreateInput!) {
      createSession(data: $data) { id date dropInPrice }
    }
    `,
    {
      data: {
        program: { connect: { id: openGymTuesday.id } },
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        startTime: new Date(new Date().setHours(19, 0, 0, 0)).toISOString(),
        endTime: new Date(new Date().setHours(22, 0, 0, 0)).toISOString(),
        facility: { connect: { id: facilities["Full Court"].id } },
        dropInPrice: 15,
      },
    }
  );
  // Create a drop-in enrollment for the user for this session
  await gql(
    `
    mutation ($data: EnrollmentCreateInput!) {
      createEnrollment(data: $data) { id program { id } session { id } customer { id } }
    }
    `,
    {
      data: {
        program: { connect: { id: openGymTuesday.id } },
        session: { connect: { id: openGymSession1.id } },
        customer: { connect: { id: users.CUSTOMER.id } },
        status: "confirmed",
        enrolledAt: new Date().toISOString(),
      },
    }
  );
  // Also enable drop-in for Bitty Ballers
  await gql(
    `
    mutation ($where: ProgramWhereUniqueInput!, $data: ProgramUpdateInput!) {
      updateProgram(where: $where, data: $data) { id allowDropIn dropInPrice }
    }
    `,
    {
      where: { id: bittyBallers.id },
      data: { allowDropIn: true, dropInPrice: 20 },
    }
  );

  console.log("Seed data loaded via GraphQL!");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
