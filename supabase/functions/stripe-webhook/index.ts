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

// --- Product ID Mappings (from your Stripe Dashboard) ---
const PLAN_PRODUCT_IDS = {
  pro: Deno.env.get("STRIPE_PRODUCT_ID_PRO"),
  classic: Deno.env.get("STRIPE_PRODUCT_ID_CLASSIC"),
};

const PULSE_PACK_PRODUCT_IDS = {
  p_100: Deno.env.get("STRIPE_PRODUCT_ID_PULSE_100"),
  p_250: Deno.env.get("STRIPE_PRODUCT_ID_PULSE_250"),
  p_600: Deno.env.get("STRIPE_PRODUCT_ID_PULSE_600"),
};

// --- Pulse Amounts ---
const pulsesPerProduct = {
    [PULSE_PACK_PRODUCT_IDS.p_100 as string]: 100,
    [PULSE_PACK_PRODUCT_IDS.p_250 as string]: 250,
    [PULSE_PACK_PRODUCT_IDS.p_600 as string]: 600,
    [PLAN_PRODUCT_IDS.classic as string]: 210,
    [PLAN_PRODUCT_IDS.pro as string]: 500,
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
    console.error(`[stripe-webhook] Webhook signature verification failed: ${err.message}`);
    return new Response(err.message, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("[stripe-webhook] Received checkout.session.completed event.");
      
      const userId = session.metadata?.user_id;
      const priceId = session.metadata?.price_id;

      if (!userId || !priceId) {
        throw new Error(`Missing userId or priceId in session metadata: ${session.id}`);
      }

      const price = await stripe.prices.retrieve(priceId);
      const productId = price.product as string;
      console.log(`[stripe-webhook] Retrieved productId: ${productId} from priceId: ${priceId}`);

      const pulsesToAdd = pulsesPerProduct[productId];
      const isPlan = Object.values(PLAN_PRODUCT_IDS).includes(productId);
      const isPulsePack = Object.values(PULSE_PACK_PRODUCT_IDS).includes(productId);

      // Handle Plan Purchase
      if (isPlan) {
        const planType = productId === PLAN_PRODUCT_IDS.pro ? 'pro' : 'classic';
        console.log(`[stripe-webhook] Processing plan purchase for user ${userId}, plan ${planType}`);
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await supabaseAdmin.from("profiles").update({ plan_type: planType, plan_expires_at: expiresAt.toISOString() }).eq("id", userId);
        if (pulsesToAdd) {
            await supabaseAdmin.rpc("add_pulses_to_user", { user_id_input: userId, pulses_to_add: pulsesToAdd });
        }
        const { error: subscriptionUpsertError } = await supabaseAdmin.from("subscriptions").upsert({
            user_id: userId,
            plan_id: planType,
            stripe_subscription_id: session.payment_intent, 
            status: 'active',
        }, { onConflict: 'user_id' });

        if (subscriptionUpsertError) {
            console.error("[stripe-webhook] FAILED TO UPSERT INTO SUBSCRIPTIONS TABLE:", subscriptionUpsertError);
            throw new Error(`Failed to upsert subscription record: ${subscriptionUpsertError.message}`);
        }

        console.log(`[stripe-webhook] Plan purchase for user ${userId} processed successfully.`);

      // Handle Pulse Pack Purchase
      } else if (isPulsePack) {
        console.log(`[stripe-webhook] Processing one-time pulse purchase for user ${userId}, product ${productId}`);
        
        if (pulsesToAdd) {
            await supabaseAdmin.rpc("add_pulses_to_user", { user_id_input: userId, pulses_to_add: pulsesToAdd });
        }
        
        const { error: insertError } = await supabaseAdmin.from("purchases").insert({
            user_id: userId,
            product_id: productId,
            stripe_payment_intent_id: session.payment_intent,
            status: 'succeeded',
            amount: pulsesToAdd,
            currency: price.currency,
        });

        if (insertError) {
            console.error("[stripe-webhook] FAILED TO INSERT INTO PURCHASES TABLE:", insertError);
            throw new Error(`Failed to insert purchase record: ${insertError.message}`);
        } else {
            console.log("[stripe-webhook] Successfully inserted record into purchases table.");
        }

      } else {
        console.warn(`[stripe-webhook] Unhandled product ID: ${productId}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (error) {
    console.error("[stripe-webhook] CATCH BLOCK ERROR:", error.message);
    return new Response(
      JSON.stringify({ status: "error", error: error.message }),
      {
        status: 200, 
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
