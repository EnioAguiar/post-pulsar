import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY") as string, {
  apiVersion: "2025-08-27.basil",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

// Maps product IDs to pulses for one-time purchases
const pulsesPerProduct = {
  pulse_pack_100: 100,
  pulse_pack_250: 250,
  pulse_pack_600: 600,
};

// Maps Stripe Price IDs to plan types and pulse amounts for subscriptions
const planInfoByPriceId = {
  [Deno.env.get("STRIPE_CLASSIC_PLAN_PRICE_ID")!]: { planType: "classic", pulses: 210 },
  [Deno.env.get("STRIPE_PRO_PLAN_PRICE_ID")!]: { planType: "pro", pulses: 500 },
};

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET")!,
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(err.message, { status: 400 });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      // --- Handle One-Time Pulse Purchases ---
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      const { data: purchase, error } = await supabaseAdmin
        .from("purchases")
        .select("user_id, product_id, status")
        .eq("stripe_payment_intent_id", paymentIntent.id)
        .single();

      if (error) {
        // This purchase was likely a subscription, so we can ignore the error.
        console.log(`Purchase not found for PaymentIntent ${paymentIntent.id}. Likely a subscription.`);
      } else if (purchase && purchase.status !== "succeeded") {
        await supabaseAdmin
          .from("purchases")
          .update({ status: "succeeded" })
          .eq("stripe_payment_intent_id", paymentIntent.id);

        const pulsesToAdd = pulsesPerProduct[purchase.product_id];
        if (pulsesToAdd) {
          await supabaseAdmin.rpc("add_pulses_to_user", {
            user_id_input: purchase.user_id,
            pulses_to_add: pulsesToAdd,
          });
        }
      }
    } else if (event.type === "checkout.session.completed") {
      // --- Handle New Subscriptions ---
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === "subscription") {
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;

        const planInfo = planInfoByPriceId[priceId];
        if (!planInfo) {
          throw new Error(`Plan info not found for price ID: ${priceId}`);
        }

        // Find user by customer ID
        const { data: profile, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profileError) {
          throw new Error(`Failed to find profile for customer ${customerId}: ${profileError.message}`);
        }

        const userId = profile.id;

        // Update user's profile with the new plan and customer ID
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            plan_type: planInfo.planType,
            stripe_customer_id: customerId, // Save the customer ID on success
          })
          .eq("id", userId);

        if (updateError) {
          throw new Error(`Failed to update profile for user ${userId}: ${updateError.message}`);
        }

        // Add the initial pulses for the plan
        await supabaseAdmin.rpc("add_pulses_to_user", {
          user_id_input: userId,
          pulses_to_add: planInfo.pulses,
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});
