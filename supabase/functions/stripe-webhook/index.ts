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

const REFERRAL_BONUS_PULSES = 50;

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

async function handleReferralReward(customerId: string) {
  try {
    console.log(`[stripe-webhook] Checking for referral for customer: ${customerId}`);
    const { data: payingProfile, error: payingProfileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (payingProfileError || !payingProfile) {
      console.warn(`[stripe-webhook] Could not find profile for customer ${customerId}. Cannot process referral.`);
      return;
    }
    const referredUserId = payingProfile.id;

    const { data: referral, error: referralError } = await supabaseAdmin
      .from("referrals")
      .select("id, referrer_id")
      .eq("referred_id", referredUserId)
      .eq("status", "pending")
      .single();

    if (referralError || !referral) {
      console.log(`[stripe-webhook] No pending referral found for user ${referredUserId}.`);
      return;
    }

    console.log(`[stripe-webhook] Found pending referral. Rewarding referrer: ${referral.referrer_id}`);
    const { error: rpcError } = await supabaseAdmin.rpc("add_pulses_to_user", {
      user_id_input: referral.referrer_id,
      pulses_to_add: REFERRAL_BONUS_PULSES,
    });

    if (rpcError) {
      console.error(`[stripe-webhook] Failed to grant referral bonus to ${referral.referrer_id}:`, rpcError);
      return;
    }

    const { error: updateError } = await supabaseAdmin
      .from("referrals")
      .update({ status: "completed" })
      .eq("id", referral.id);

    if (updateError) {
      console.error(`[stripe-webhook] Failed to update referral status to completed for id ${referral.id}:`, updateError);
    }

    console.log(`[stripe-webhook] Successfully rewarded referrer ${referral.referrer_id} and marked referral ${referral.id} as completed.`);

  } catch (error) {
    console.error("[stripe-webhook] Unexpected error in handleReferralReward:", error.message);
  }
}

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
    console.error(`[stripe-webhook] Webhook signature verification failed: ${err.message}`);
    return new Response(err.message, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("[stripe-webhook] Received checkout.session.completed event:", JSON.stringify(session, null, 2));
        const customerId = session.customer as string;

        if (session.mode === "subscription") {
          console.log("[stripe-webhook] Processing subscription...");
          const subscriptionId = session.subscription as string;
          const planId = session.metadata?.plan_id;
          const userId = session.metadata?.user_id;

          if (!userId || !planId) {
            throw new Error(`Missing userId or planId in subscription metadata for session: ${session.id}`);
          }

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0].price.id;
          const planInfo = planInfoByPriceId[priceId];

          if (!planInfo) throw new Error(`Plan info not found for price ID: ${priceId}`);

          // Update user's profile
          const { error: updateProfileError } = await supabaseAdmin
            .from("profiles")
            .update({ plan_type: planInfo.planType, stripe_customer_id: customerId })
            .eq("id", userId);

          if (updateProfileError) throw new Error(`Failed to update profile for user ${userId}: ${updateProfileError.message}`);

          // Add pulses for the new plan
          await supabaseAdmin.rpc("add_pulses_to_user", { user_id_input: userId, pulses_to_add: planInfo.pulses });

          // Create a record in the new subscriptions table
          const { error: insertSubscriptionError } = await supabaseAdmin
            .from("subscriptions")
            .insert({
              user_id: userId,
              plan_id: planId,
              stripe_subscription_id: subscriptionId,
              status: "active",
            });

          if (insertSubscriptionError) {
            // Log the error but don't throw, as the main fulfillment succeeded
            console.error(`[stripe-webhook] Failed to insert record into subscriptions table: ${insertSubscriptionError.message}`);
          }

          console.log(`[stripe-webhook] Subscription for user ${userId} processed successfully.`);

        } else if (session.mode === "payment") {
          console.log("[stripe-webhook] Processing one-time payment...");
          const idempotencyKey = session.metadata?.idempotency_key;
          const userId = session.metadata?.user_id;
          const productId = session.metadata?.product_id;

          if (!idempotencyKey || !userId || !productId) {
            throw new Error(`Missing metadata in checkout session for one-time purchase: ${session.id}`);
          }

          const { data: purchase, error: purchaseError } = await supabaseAdmin
            .from("purchases")
            .select("status")
            .eq("idempotency_key", idempotencyKey)
            .single();

          if (purchaseError) throw new Error(`Purchase with idempotency key ${idempotencyKey} not found.`);
          if (purchase.status !== 'pending') {
            console.warn(`[stripe-webhook] Received webhook for already processed purchase: ${idempotencyKey}, status: ${purchase.status}`);
            break;
          }

          const { error: updateError } = await supabaseAdmin
            .from("purchases")
            .update({ status: "succeeded" })
            .eq("idempotency_key", idempotencyKey);

          if (updateError) throw new Error(`Failed to update purchase status for ${idempotencyKey}: ${updateError.message}`);

          const pulsesToAdd = pulsesPerProduct[productId];
          if (pulsesToAdd) {
            await supabaseAdmin.rpc("add_pulses_to_user", { user_id_input: userId, pulses_to_add: pulsesToAdd });
          }
          console.log(`[stripe-webhook] One-time purchase for user ${userId} processed successfully.`);
        }
        
        if (customerId) {
          await handleReferralReward(customerId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0].price.id;

        const planInfo = planInfoByPriceId[priceId];
        if (!planInfo) {
            console.warn(`[stripe-webhook] Received subscription update for an unknown price ID: ${priceId}`);
            break;
        }

        const { error } = await supabaseAdmin
            .from("profiles")
            .update({ plan_type: planInfo.planType })
            .eq("stripe_customer_id", customerId);

        if (error) {
            throw new Error(`[stripe-webhook] Failed to update plan type for customer ${customerId}: ${error.message}`);
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[stripe-webhook] Informational: Received payment_intent.succeeded for ${paymentIntent.id}. Fulfillment is handled by checkout.session.completed.`);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const idempotencyKey = paymentIntent.metadata?.idempotency_key;
        if (!idempotencyKey) break; 

        await supabaseAdmin
          .from("purchases")
          .update({ status: "failed" })
          .eq("idempotency_key", idempotencyKey);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const idempotencyKey = session.metadata?.idempotency_key;
        if (!idempotencyKey) break;

        await supabaseAdmin
          .from("purchases")
          .update({ status: "expired" })
          .eq("idempotency_key", idempotencyKey);
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (error) {
    console.error("[stripe-webhook] Error processing webhook:", error.message);
    return new Response(JSON.stringify({ status: "error", error: error.message }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
