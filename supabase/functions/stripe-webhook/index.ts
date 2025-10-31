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
// We now check against hardcoded Product IDs, which are stable.
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
    [PULSE_PACK_PRODUCT_IDS.p_100]: 100,
    [PULSE_PACK_PRODUCT_IDS.p_250]: 250,
    [PULSE_PACK_PRODUCT_IDS.p_600]: 600,
    [PLAN_PRODUCT_IDS.classic]: 210,
    [PLAN_PRODUCT_IDS.pro]: 500,
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
      console.log("[stripe-webhook] Received checkout.session.completed event:", JSON.stringify(session, null, 2));
      
      const userId = session.metadata?.user_id;
      const priceId = session.metadata?.price_id;

      if (!userId || !priceId) {
        throw new Error(`Missing userId or priceId in session metadata: ${session.id}`);
      }

      // Retrieve the price object to find the associated product ID
      const price = await stripe.prices.retrieve(priceId);
      const productId = price.product as string;
      console.log(`[stripe-webhook] Retrieved productId: ${productId} from priceId: ${priceId}`);

      const pulsesToAdd = pulsesPerProduct[productId];

      // Handle Plan Purchase
      if (Object.values(PLAN_PRODUCT_IDS).includes(productId)) {
        const planType = productId === PLAN_PRODUCT_IDS.pro ? 'pro' : 'classic';
        console.log(`[stripe-webhook] Processing plan purchase for user ${userId}, plan ${planType}`);
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const { error: updateProfileError } = await supabaseAdmin
          .from("profiles")
          .update({
            plan_type: planType,
            plan_expires_at: expiresAt.toISOString(),
          })
          .eq("id", userId);

        if (updateProfileError) throw new Error(`Failed to update profile for user ${userId}: ${updateProfileError.message}`);

        if (pulsesToAdd) {
            await supabaseAdmin.rpc("add_pulses_to_user", { user_id_input: userId, pulses_to_add: pulsesToAdd });
        }
        console.log(`[stripe-webhook] Plan purchase for user ${userId} processed successfully.`);

      // Handle Pulse Pack Purchase
      } else if (Object.values(PULSE_PACK_PRODUCT_IDS).includes(productId)) {
        console.log(`[stripe-webhook] Processing one-time pulse purchase for user ${userId}, product ${productId}`);
        
        if (pulsesToAdd) {
            await supabaseAdmin.rpc("add_pulses_to_user", { user_id_input: userId, pulses_to_add: pulsesToAdd });
        }
        console.log(`[stripe-webhook] One-time pulse purchase for user ${userId} processed successfully.`);
      } else {
        console.warn(`[stripe-webhook] Unhandled product ID: ${productId}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (error) {
    console.error("[stripe-webhook] Error processing webhook:", error.message);
    return new Response(
      JSON.stringify({ status: "error", error: error.message }),
      {
        status: 200, // Return 200 to acknowledge receipt, even on error
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
