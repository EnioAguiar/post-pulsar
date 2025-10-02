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
  idempotencyKey: string,
): Promise<{ clientSecret: string | null }> {
  const product = products[productId];
  if (!product) {
    throw new Error(`Product with ID '${productId}' not found.`);
  }

  const { data: existingPurchase } = await supabaseAdmin
    .from("purchases")
    .select("stripe_payment_intent_id")
    .eq("idempotency_key", idempotencyKey)
    .single();

  if (existingPurchase?.stripe_payment_intent_id) {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      existingPurchase.stripe_payment_intent_id,
    );
    return { clientSecret: paymentIntent.client_secret };
  }

  const customerId = await getOrCreateStripeCustomer(userId, supabaseAdmin, stripe);

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: product.price,
      currency: product.currency,
      customer: customerId, // Associate the payment with the customer
      automatic_payment_methods: { enabled: true },
    },
    { idempotencyKey: idempotencyKey },
  );

  const { error: insertError } = await supabaseAdmin
    .from("purchases")
    .insert({
      user_id: userId,
      product_id: productId,
      idempotency_key: idempotencyKey,
      stripe_payment_intent_id: paymentIntent.id,
      status: "pending",
      amount: product.price,
      currency: product.currency,
    });

  if (insertError) {
    throw insertError;
  }

  return { clientSecret: paymentIntent.client_secret };
}
