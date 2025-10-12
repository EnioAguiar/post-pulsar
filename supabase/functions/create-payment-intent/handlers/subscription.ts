import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getOrCreateStripeCustomer } from "../services/stripe.ts";

// Maps our internal plan IDs to Stripe's Price IDs from environment variables
const subscriptionPlans = {
  plan_classic: Deno.env.get("STRIPE_CLASSIC_PLAN_PRICE_ID"),
  plan_pro: Deno.env.get("STRIPE_PRO_PLAN_PRICE_ID"),
};

export async function handleSubscription(
  supabaseAdmin: ReturnType<typeof createClient>,
  stripe: Stripe,
  userId: string,
  productId: string,
): Promise<{ checkoutUrl: string | null }> {
  const priceId = subscriptionPlans[productId];
  if (!priceId) {
    throw new Error("Subscription plan not found or configured.");
  }

  const customerId = await getOrCreateStripeCustomer(userId, supabaseAdmin, stripe);

  const siteUrl = Deno.env.get("SITE_URL");
  if (!siteUrl) {
    throw new Error("SITE_URL environment variable is not set.");
  }

  // Define success and cancel URLs using the SITE_URL environment variable
  const successUrl = `${siteUrl}/app/billing?subscription_success=true`;
  const cancelUrl = `${siteUrl}/app/billing`;

  // Create a Stripe Checkout Session for a subscription
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      plan_id: productId,
      user_id: userId,
    },
  });

  if (!session.url) {
    throw new Error("Could not create Stripe Checkout session.");
  }

  return { checkoutUrl: session.url };
}
