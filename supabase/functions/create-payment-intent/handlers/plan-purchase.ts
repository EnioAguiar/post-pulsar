import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getOrCreateStripeCustomer } from "../services/stripe.ts";

// Define plan details, including name and price in cents
const planDetails = {
  plan_classic: {
    name: "Classic Plan",
    price: 900, // $9.00
    currency: "usd",
  },
  plan_pro: {
    name: "Pro Plan",
    price: 2900, // $29.00
    currency: "usd",
  },
};

export async function handlePlanPurchase(
  supabaseAdmin: ReturnType<typeof createClient>,
  stripe: Stripe,
  userId: string,
  planId: string,
): Promise<{ checkoutUrl: string | null }> {
  const plan = planDetails[planId];
  if (!plan) {
    throw new Error(`Plan with ID '${planId}' not found.`);
  }

  const customerId = await getOrCreateStripeCustomer(userId, supabaseAdmin, stripe);

  const siteUrl = Deno.env.get("SITE_URL");
  if (!siteUrl) {
    throw new Error("SITE_URL environment variable is not set.");
  }

  const successUrl = `${siteUrl}/app/billing?subscription_success=true`;
  const cancelUrl = `${siteUrl}/app/billing`;

  // Create a Stripe Checkout Session for a one-time payment
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment", // Changed from "subscription" to "payment"
    line_items: [
      {
        price_data: { // Using price_data for one-time payments
          currency: plan.currency,
          product_data: {
            name: plan.name,
          },
          unit_amount: plan.price,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      plan_id: planId,
      user_id: userId,
    },
  });

  if (!session.url) {
    throw new Error("Could not create Stripe Checkout session.");
  }

  return { checkoutUrl: session.url };
}