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

export async function handleOneTimePurchase(
  supabaseAdmin: ReturnType<typeof createClient>,
  stripe: Stripe,
  userId: string,
  productId: string,
): Promise<{ checkoutUrl: string | null }> {
  const product = products[productId];
  if (!product) {
    throw new Error(`Product with ID '${productId}' not found.`);
  }

  const customerId = await getOrCreateStripeCustomer(userId, supabaseAdmin, stripe);

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
          unit_amount: product.price,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    // Pass the user ID and product ID to the webhook for fulfillment
    client_reference_id: userId,
    metadata: {
      product_id: productId,
    },
  });

  if (!session.url) {
    throw new Error("Could not create Stripe Checkout session.");
  }

  return { checkoutUrl: session.url };
}
