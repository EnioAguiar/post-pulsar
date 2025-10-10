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
    console.log(`Checking for referral for customer: ${customerId}`);
    // 1. Find the user who just paid
    const { data: payingProfile, error: payingProfileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (payingProfileError || !payingProfile) {
      console.warn(`Could not find profile for customer ${customerId}. Cannot process referral.`);
      return;
    }
    const referredUserId = payingProfile.id;

    // 2. Check if this user was referred and the referral is still pending
    const { data: referral, error: referralError } = await supabaseAdmin
      .from("referrals")
      .select("id, referrer_id")
      .eq("referred_id", referredUserId)
      .eq("status", "pending")
      .single();

    if (referralError || !referral) {
      console.log(`No pending referral found for user ${referredUserId}.`);
      return; // Not a referred user or already processed
    }

    // 3. Reward the referrer
    console.log(`Found pending referral. Rewarding referrer: ${referral.referrer_id}`);
    const { error: rpcError } = await supabaseAdmin.rpc("add_pulses_to_user", {
      user_id_input: referral.referrer_id,
      pulses_to_add: REFERRAL_BONUS_PULSES,
    });

    if (rpcError) {
      console.error(`Failed to grant referral bonus to ${referral.referrer_id}:`, rpcError);
      // Do not update status, so we can retry later
      return;
    }

    // 4. Mark the referral as completed
    const { error: updateError } = await supabaseAdmin
      .from("referrals")
      .update({ status: "completed" })
      .eq("id", referral.id);

    if (updateError) {
      console.error(`Failed to update referral status to completed for id ${referral.id}:`, updateError);
      // This is not ideal, but the user was rewarded. Logging is important.
    }

    console.log(`Successfully rewarded referrer ${referral.referrer_id} and marked referral ${referral.id} as completed.`);

  } catch (error) {
    console.error("Unexpected error in handleReferralReward:", error.message);
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
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(err.message, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;

        if (session.mode === "subscription") {
          const subscriptionId = session.subscription as string;

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0].price.id;
          const planInfo = planInfoByPriceId[priceId];

          if (!planInfo) throw new Error(`Plan info not found for price ID: ${priceId}`);

          const { data: profile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .single();

          if (profileError) throw new Error(`Profile not found for customer ${customerId}: ${profileError.message}`);

          const userId = profile.id;
          const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({ plan_type: planInfo.planType, stripe_customer_id: customerId })
            .eq("id", userId);

          if (updateError) throw new Error(`Failed to update profile for user ${userId}: ${updateError.message}`);

          await supabaseAdmin.rpc("add_pulses_to_user", { user_id_input: userId, pulses_to_add: planInfo.pulses });
        }
        
        // Handle referral reward after successful payment
        await handleReferralReward(customerId);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0].price.id;

        const planInfo = planInfoByPriceId[priceId];
        if (!planInfo) {
            console.warn(`Received subscription update for an unknown price ID: ${priceId}`);
            break;
        }

        const { error } = await supabaseAdmin
            .from("profiles")
            .update({ plan_type: planInfo.planType })
            .eq("stripe_customer_id", customerId);

        if (error) {
            throw new Error(`Failed to update plan type for customer ${customerId}: ${error.message}`);
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const customerId = paymentIntent.customer as string;
        const idempotencyKey = paymentIntent.metadata?.idempotency_key;

        if (!idempotencyKey) {
          console.warn("Received payment_intent.succeeded without idempotency_key. Cannot process fulfillment.");
          break;
        }

        const { data: purchase, error: purchaseError } = await supabaseAdmin
          .from("purchases")
          .select("status, product_id, user_id")
          .eq("idempotency_key", idempotencyKey)
          .single();

        if (purchaseError) throw new Error(`Purchase with idempotency key ${idempotencyKey} not found.`);

        if (purchase.status !== 'pending') {
          console.warn(`Received webhook for already processed purchase: ${idempotencyKey}, status: ${purchase.status}`);
          break;
        }

        const { error: updateError } = await supabaseAdmin
          .from("purchases")
          .update({ status: "succeeded" })
          .eq("idempotency_key", idempotencyKey);

        if (updateError) throw new Error(`Failed to update purchase status for ${idempotencyKey}: ${updateError.message}`);

        const pulsesToAdd = pulsesPerProduct[purchase.product_id];
        if (pulsesToAdd) {
          await supabaseAdmin.rpc("add_pulses_to_user", { user_id_input: purchase.user_id, pulses_to_add: pulsesToAdd });
        }

        // Handle referral reward after successful payment
        if (customerId) {
          await handleReferralReward(customerId);
        }
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
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (error) {
    console.error("Error processing webhook:", error.message);
    // As per best practices, always return 200 OK, even on error.
    return new Response(JSON.stringify({ status: "error", error: error.message }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
