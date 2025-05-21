import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

const keystoneApiUrl = process.env.NEXT_PUBLIC_KEYSTONE_API_URL as string;

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");

  const body = await req.text();

  if (!sig) {
    console.log("Missing stripe-signature header");
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log("Event type:", event.type);

    // Handle different event types
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Create Payment record in Keystone
        const createPaymentMutation = `
          mutation CreatePayment($data: PaymentCreateInput!) {
            createPayment(data: $data) {
              id
              amount
              status
              stripePaymentIntentId
            }
          }
        `;

        const paymentInput = {
          amount: paymentIntent.amount / 100, // Convert from cents to dollars
          status: "completed",
          stripePaymentIntentId: paymentIntent.id,
          customer: { connect: { id: paymentIntent.metadata.userId } },
        };

        const paymentRes = await fetch(keystoneApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: createPaymentMutation,
            variables: { data: paymentInput },
          }),
        });

        const { data: paymentResult, errors: paymentErrors } =
          await paymentRes.json();

        if (paymentErrors) {
          console.error("Failed to create payment record:", paymentErrors);
          return NextResponse.json(
            { error: "Failed to create payment record" },
            { status: 500 }
          );
        }

        // Create Invoice record
        const createInvoiceMutation = `
          mutation CreateInvoice($data: InvoiceCreateInput!) {
            createInvoice(data: $data) {
              id
              amount
              status
              payment { id }
            }
          }
        `;

        const invoiceInput = {
          amount: paymentIntent.amount / 100,
          status: "paid",
          payment: { connect: { id: paymentResult.createPayment.id } },
          customer: { connect: { id: paymentIntent.metadata.userId } },
        };

        const invoiceRes = await fetch(keystoneApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: createInvoiceMutation,
            variables: { data: invoiceInput },
          }),
        });

        const { errors: invoiceErrors } = await invoiceRes.json();

        if (invoiceErrors) {
          console.error("Failed to create invoice record:", invoiceErrors);
          return NextResponse.json(
            { error: "Failed to create invoice record" },
            { status: 500 }
          );
        }

        // Update enrollments and rentals status to 'confirmed'
        if (paymentIntent.metadata.enrollmentIds) {
          const enrollmentIds = JSON.parse(
            paymentIntent.metadata.enrollmentIds
          );
          for (const enrollmentId of enrollmentIds) {
            const updateEnrollmentMutation = `
              mutation UpdateEnrollment($id: ID!, $data: EnrollmentUpdateInput!) {
                updateEnrollment(id: $id, data: $data) {
                  id
                  status
                }
              }
            `;

            await fetch(keystoneApiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: updateEnrollmentMutation,
                variables: {
                  id: enrollmentId,
                  data: { status: "confirmed" },
                },
              }),
            });
          }
        }

        if (paymentIntent.metadata.rentalIds) {
          const rentalIds = JSON.parse(paymentIntent.metadata.rentalIds);
          for (const rentalId of rentalIds) {
            const updateRentalMutation = `
              mutation UpdateFacilityRental($id: ID!, $data: FacilityRentalUpdateInput!) {
                updateFacilityRental(id: $id, data: $data) {
                  id
                  status
                }
              }
            `;

            await fetch(keystoneApiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: updateRentalMutation,
                variables: {
                  id: rentalId,
                  data: { status: "confirmed" },
                },
              }),
            });
          }
        }

        // Process training packages
        if (paymentIntent.metadata.trainingPackageIds) {
          const trainingPackageIds = JSON.parse(
            paymentIntent.metadata.trainingPackageIds
          );
          for (const trainingPackageId of trainingPackageIds) {
            // Fetch TrainingPackage details to get sessionCount
            const trainingPackageQuery = `
              query GetTrainingPackage($id: ID!) {
                trainingPackage(where: { id: $id }) {
                  id
                  name
                  sessionCount
                }
              }
            `;
            const trainingPackageRes = await fetch(keystoneApiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: trainingPackageQuery,
                variables: { id: trainingPackageId },
              }),
            });
            const { data: trainingPackageData } =
              await trainingPackageRes.json();
            const sessionCount =
              trainingPackageData.trainingPackage.sessionCount;

            const createPurchasedPackageMutation = `
              mutation CreatePurchasedPackage($data: PurchasedPackageCreateInput!) {
                createPurchasedPackage(data: $data) {
                  id
                  package { id name }
                  customer { id name }
                  sessionsRemaining
                  sessionsUsed
                }
              }
            `;
            const purchasedPackageInput = {
              package: { connect: { id: trainingPackageId } },
              customer: { connect: { id: paymentIntent.metadata.userId } },
              sessionsRemaining: sessionCount,
              sessionsUsed: 0,
            };
            await fetch(keystoneApiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: createPurchasedPackageMutation,
                variables: { data: purchasedPackageInput },
              }),
            });
          }
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Create Payment record with failed status
        const createPaymentMutation = `
          mutation CreatePayment($data: PaymentCreateInput!) {
            createPayment(data: $data) {
              id
              amount
              status
              stripePaymentIntentId
            }
          }
        `;

        const paymentInput = {
          amount: paymentIntent.amount / 100,
          status: "failed",
          stripePaymentIntentId: paymentIntent.id,
          customer: { connect: { id: paymentIntent.metadata.userId } },
        };

        await fetch(keystoneApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: createPaymentMutation,
            variables: { data: paymentInput },
          }),
        });

        // Update enrollments and rentals status to 'cancelled'
        if (paymentIntent.metadata.enrollmentIds) {
          const enrollmentIds = JSON.parse(
            paymentIntent.metadata.enrollmentIds
          );
          for (const enrollmentId of enrollmentIds) {
            const updateEnrollmentMutation = `
              mutation UpdateEnrollment($id: ID!, $data: EnrollmentUpdateInput!) {
                updateEnrollment(id: $id, data: $data) {
                  id
                  status
                }
              }
            `;

            await fetch(keystoneApiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: updateEnrollmentMutation,
                variables: {
                  id: enrollmentId,
                  data: { status: "cancelled" },
                },
              }),
            });
          }
        }

        if (paymentIntent.metadata.rentalIds) {
          const rentalIds = JSON.parse(paymentIntent.metadata.rentalIds);
          for (const rentalId of rentalIds) {
            const updateRentalMutation = `
              mutation UpdateFacilityRental($id: ID!, $data: FacilityRentalUpdateInput!) {
                updateFacilityRental(id: $id, data: $data) {
                  id
                  status
                }
              }
            `;

            await fetch(keystoneApiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: updateRentalMutation,
                variables: {
                  id: rentalId,
                  data: { status: "cancelled" },
                },
              }),
            });
          }
        }

        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;

        // Create Refund record
        const createRefundMutation = `
          mutation CreateRefund($data: RefundCreateInput!) {
            createRefund(data: $data) {
              id
              amount
              status
              stripeChargeId
            }
          }
        `;

        const refundInput = {
          amount: charge.amount_refunded / 100,
          status: "completed",
          stripeChargeId: charge.id,
          customer: { connect: { id: charge.metadata.userId } },
        };

        await fetch(keystoneApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: createRefundMutation,
            variables: { data: refundInput },
          }),
        });

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }
}
