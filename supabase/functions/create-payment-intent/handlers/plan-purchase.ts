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

// Define pricing tiers by country code
const pricingTiers = {
  tier3: ["IN", "ID", "PK", "NG", "BD"], // 75% discount
  tier2: ["BR", "MX", "RU", "TR"], // 50% discount
};

function getAdjustedPrice(price: number, countryCode: string | null): number {
  if (!countryCode) return price;

  if (pricingTiers.tier3.includes(countryCode)) {
    console.log(`Applying Tier 3 (75%) discount for country: ${countryCode}`);
    return price * 0.25; // 75% discount
  }

  if (pricingTiers.tier2.includes(countryCode)) {
    console.log(`Applying Tier 2 (50%) discount for country: ${countryCode}`);
    return price * 0.5; // 50% discount
  }

  console.log(`No discount applied for country: ${countryCode}`);
  return price; // Tier 1, no discount
}

export async function handlePlanPurchase(
  supabaseAdmin: ReturnType<typeof createClient>,
  stripe: Stripe,
  userId: string,
  planId: string,
  countryCode: string | null,
): Promise<{ checkoutUrl: string | null }> {
  const plan = planDetails[planId];
  if (!plan) {
    throw new Error(`Plan with ID '${planId}' not found.`);
  }

  // Calculate adjusted price based on country
  const adjustedPrice = getAdjustedPrice(plan.price, countryCode);

  const customerId = await getOrCreateStripeCustomer(
    userId,
    supabaseAdmin,
    stripe,
  );

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
        price_data: {
          // Using price_data for one-time payments
          currency: plan.currency,
          product_data: {
            name: plan.name,
          },
          unit_amount: Math.round(adjustedPrice), // Use the adjusted price
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
