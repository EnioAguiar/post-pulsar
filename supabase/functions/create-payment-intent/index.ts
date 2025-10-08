import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { corsHeaders } from "../_shared/cors.ts";
import { handleOneTimePurchase } from "./handlers/one-time-purchase.ts";
import { handleSubscription } from "./handlers/subscription.ts";

// Initialize Stripe client
const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY") as string, {
  apiVersion: "2025-08-27.basil",
  httpClient: Stripe.createFetchHttpClient(),
});

// Main function handler
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { productId, idempotencyKey } = await req.json();

    if (!productId) {
      throw new Error("ProductId is required.");
    }

    const authHeader = req.headers.get("Authorization")!;
    const jwt = authHeader.replace("Bearer ", "");
    const [_header, payload, _signature] = jwt.split(".");
    const userId = JSON.parse(atob(payload)).sub;

    if (!userId) {
      throw new Error("User not authenticated.");
    }

    let responsePayload: { clientSecret?: string | null; checkoutUrl?: string | null } = {};

    if (productId.startsWith("plan_")) {
      const result = await handleSubscription(
        supabaseAdmin,
        stripe,
        userId,
        productId,
      );
      responsePayload = { checkoutUrl: result.checkoutUrl };
    } else {
      const result = await handleOneTimePurchase(
        supabaseAdmin,
        stripe,
        userId,
        productId,
      );
      responsePayload = { checkoutUrl: result.checkoutUrl };
    }

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in create-payment-intent function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
