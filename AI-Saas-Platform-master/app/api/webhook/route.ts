import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    // Construct event from webhook payload and signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.log("❌ Webhook Error:", error.message);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    console.log("✅ Checkout Session Completed:", session);
    console.log("User ID from session metadata:", session.metadata?.userId);

    if (!session?.metadata?.userId) {
      console.log("⚠️ Missing userId in session metadata");
      return new NextResponse("User ID is required", { status: 400 });
    }

    const userId = session.metadata.userId;
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

    console.log("Subscription details:", subscription);

    try {
      // Store the subscription information in the database using upsert
      await prismadb.userSubscription.upsert({
        where: { userId },  // Ensure `userId` is the unique identifier in your model
        update: {
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
        create: {
          userId,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      });
      console.log("✅ Subscription stored for user:", userId);
    } catch (dbError) {
      console.error("❌ Error storing subscription in database:", dbError);
      return new NextResponse("Error storing subscription in database", { status: 500 });
    }
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = invoice.subscription as string;

    console.log("✅ Invoice Payment Succeeded:", invoice);

    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      // Check if metadata exists and userId is present
      if (invoice.metadata && invoice.metadata.userId) {
        // Update subscription details in the database
        const updatedSubscription = await prismadb.userSubscription.update({
          where: {
            userId: invoice.metadata.userId,  // Update based on userId from invoice metadata
          },
          data: {
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });

        console.log("🔁 Subscription updated after invoice payment:", updatedSubscription);
      } else {
        console.log("⚠️ Missing userId in invoice metadata.");
        return new NextResponse("User ID is required in invoice metadata", { status: 400 });
      }
    } catch (dbError) {
      console.error("❌ Error updating subscription in database:", dbError);
      return new NextResponse("Error updating subscription in database", { status: 500 });
    }
  }

  // Always return 200 response to acknowledge receipt of the event
  return new NextResponse(null, { status: 200 });
}

export const dynamic = "force-dynamic";
