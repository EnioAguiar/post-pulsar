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

// Maps plan IDs to plan types and pulse amounts
const planInfo = {
  plan_classic: { planType: "classic", pulses: 210 },
  plan_pro: { planType: "pro", pulses: 500 },
};

async function handleReferralReward(customerId: string) {
  try {
    console.log(
      `[stripe-webhook] Checking for referral for customer: ${customerId}`,
    );
    const { data: payingProfile, error: payingProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

    if (payingProfileError || !payingProfile) {
      console.warn(
        `[stripe-webhook] Could not find profile for customer ${customerId}. Cannot process referral.`,
      );
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
      console.log(
        `[stripe-webhook] No pending referral found for user ${referredUserId}.`,
      );
      return;
    }

    console.log(
      `[stripe-webhook] Found pending referral. Rewarding referrer: ${referral.referrer_id}`,
    );
    const { error: rpcError } = await supabaseAdmin.rpc("add_pulses_to_user", {
      user_id_input: referral.referrer_id,
      pulses_to_add: REFERRAL_BONUS_PULSES,
    });

    if (rpcError) {
      console.error(
        `[stripe-webhook] Failed to grant referral bonus to ${referral.referrer_id}:`,
        rpcError,
      );
      return;
    }

    const { error: updateError } = await supabaseAdmin
      .from("referrals")
      .update({ status: "completed" })
      .eq("id", referral.id);

    if (updateError) {
      console.error(
        `[stripe-webhook] Failed to update referral status to completed for id ${referral.id}:`,
        updateError,
      );
    }

    console.log(
      `[stripe-webhook] Successfully rewarded referrer ${referral.referrer_id} and marked referral ${referral.id} as completed.`,
    );
  } catch (error) {
    console.error(
      "[stripe-webhook] Unexpected error in handleReferralReward:",
      error.message,
    );
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
    console.error(
      `[stripe-webhook] Webhook signature verification failed: ${err.message}`,
    );
    return new Response(err.message, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(
          "[stripe-webhook] Received checkout.session.completed event:",
          JSON.stringify(session, null, 2),
        );
        const customerId = session.customer as string;
        const userId = session.metadata?.user_id;
        const planId = session.metadata?.plan_id;
        const productId = session.metadata?.product_id;

        if (!userId) {
          throw new Error(`Missing userId in session metadata: ${session.id}`);
        }

        // Handle Plan Purchase (One-Time Payment)
        if (planId && planInfo[planId]) {
          console.log(
            `[stripe-webhook] Processing plan purchase for user ${userId}, plan ${planId}`,
          );
          const plan = planInfo[planId];
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);

          const { error: updateProfileError } = await supabaseAdmin
            .from("profiles")
            .update({
              plan_type: plan.planType,
              stripe_customer_id: customerId,
              plan_expires_at: expiresAt.toISOString(),
            })
            .eq("id", userId);

          if (updateProfileError)
            throw new Error(
              `Failed to update profile for user ${userId}: ${updateProfileError.message}`,
            );

          await supabaseAdmin.rpc("add_pulses_to_user", {
            user_id_input: userId,
            pulses_to_add: plan.pulses,
          });

          const { error: upsertSubscriptionError } = await supabaseAdmin
            .from("subscriptions")
            .upsert(
              {
                user_id: userId,
                plan_id: planId,
                stripe_subscription_id: session.payment_intent, // Use payment_intent for one-time payments
                status: "active",
              },
              {
                onConflict: "user_id",
              },
            );

          if (upsertSubscriptionError) {
            console.error(
              `[stripe-webhook] Failed to upsert record into subscriptions table: ${upsertSubscriptionError.message}`,
            );
          }

          console.log(
            `[stripe-webhook] Plan purchase for user ${userId} processed successfully.`,
          );

          // Handle Pulse Pack Purchase (One-Time Payment)
        } else if (productId && pulsesPerProduct[productId]) {
          console.log(
            `[stripe-webhook] Processing one-time pulse purchase for user ${userId}, product ${productId}`,
          );
          const idempotencyKey = session.metadata?.idempotency_key;

          if (!idempotencyKey) {
            throw new Error(
              `Missing idempotencyKey in metadata for pulse purchase: ${session.id}`,
            );
          }

          const { data: purchase, error: purchaseError } = await supabaseAdmin
            .from("purchases")
            .select("status")
            .eq("idempotency_key", idempotencyKey)
            .single();

          if (purchaseError)
            throw new Error(
              `Purchase with idempotency key ${idempotencyKey} not found.`,
            );
          if (purchase.status !== "pending") {
            console.warn(
              `[stripe-webhook] Received webhook for already processed purchase: ${idempotencyKey}, status: ${purchase.status}`,
            );
            break;
          }

          const { error: updateError } = await supabaseAdmin
            .from("purchases")
            .update({ status: "succeeded" })
            .eq("idempotency_key", idempotencyKey);

          if (updateError)
            throw new Error(
              `Failed to update purchase status for ${idempotencyKey}: ${updateError.message}`,
            );

          const pulsesToAdd = pulsesPerProduct[productId];
          if (pulsesToAdd) {
            await supabaseAdmin.rpc("add_pulses_to_user", {
              user_id_input: userId,
              pulses_to_add: pulsesToAdd,
            });
          }
          console.log(
            `[stripe-webhook] One-time purchase for user ${userId} processed successfully.`,
          );
        }

        if (customerId) {
          await handleReferralReward(customerId);
        }
        break;
      }

      // Other events are now mostly for logging or failure cases
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // These events are less relevant now but can be used for logging or manual intervention
        const subscription = event.data.object as Stripe.Subscription;
        console.log(
          `Subscription ${subscription.id} was ${event.type}. Manual check might be needed.`,
        );
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(
          `[stripe-webhook] Informational: Received payment_intent.succeeded for ${paymentIntent.id}. Fulfillment is handled by checkout.session.completed.`,
        );
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error("[stripe-webhook] Error processing webhook:", error.message);
    return new Response(
      JSON.stringify({ status: "error", error: error.message }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
