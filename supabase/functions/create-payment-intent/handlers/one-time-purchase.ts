import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getOrCreateStripeCustomer } from "../services/stripe.ts";

const products = {
  pulse_pack_100: {
    name: "100 Pulse Pack",
    price: 500, // $5 in cents
    currency: "usd",
  },
  pulse_pack_250: {
    name: "250 Pulse Pack",
    price: 1000, // $10 in cents
    currency: "usd",
  },
  pulse_pack_600: {
    name: "600 Pulse Pack",
    price: 2000, // $20 in cents
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

export async function handleOneTimePurchase(
  supabaseAdmin: ReturnType<typeof createClient>,
  stripe: Stripe,
  userId: string,
  productId: string,
  idempotencyKey: string,
  countryCode: string | null,
): Promise<{ checkoutUrl: string | null }> {
  console.log("[handleOneTimePurchase] Received args:", {
    userId,
    productId,
    idempotencyKey,
    countryCode,
  });

  const product = products[productId];
  if (!product) {
    throw new Error(`Product with ID '${productId}' not found.`);
  }

  // Calculate adjusted price based on country
  const adjustedPrice = getAdjustedPrice(product.price, countryCode);

  // Create a pending purchase record to ensure idempotency
  const { error: purchaseError } = await supabaseAdmin
    .from("purchases")
    .insert({
      idempotency_key: idempotencyKey,
      user_id: userId,
      product_id: productId,
      status: "pending",
      amount: adjustedPrice, // Use adjusted price
      currency: product.currency,
    });

  if (purchaseError) {
    // If the key already exists, it's a retry, which is safe.
    if (purchaseError.code !== "23505") {
      // 23505 is unique_violation
      throw new Error(
        `Could not create purchase record: ${purchaseError.message}`,
      );
    }
    console.log(
      `[handleOneTimePurchase] Purchase record with idempotency key ${idempotencyKey} already exists. Proceeding.`,
    );
  }

  const customerId = await getOrCreateStripeCustomer(
    userId,
    supabaseAdmin,
    stripe,
  );
  console.log("[handleOneTimePurchase] Stripe customer ID:", customerId);

  const siteUrl = Deno.env.get("SITE_URL");
  if (!siteUrl) {
    throw new Error("SITE_URL environment variable is not set.");
  }

  const successUrl = `${siteUrl}/app/billing?payment_success=true`;
  const cancelUrl = `${siteUrl}/app/billing`;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: product.currency,
          product_data: {
            name: product.name,
          },
          unit_amount: Math.round(adjustedPrice), // Use the adjusted price
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      idempotency_key: idempotencyKey,
      user_id: userId,
      product_id: productId,
    },
  });

  console.log(
    "[handleOneTimePurchase] Created Stripe session with metadata:",
    JSON.stringify(session.metadata, null, 2),
  );

  if (!session.url) {
    throw new Error("Could not create Stripe Checkout session.");
  }

  return { checkoutUrl: session.url };
}
