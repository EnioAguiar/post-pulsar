import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.5";
import Stripe from "https://esm.sh/stripe@14.24.0?target=deno";
import { corsHeaders } from "../_shared/cors.ts";

// Initialize Stripe client
const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY") as string, {
  apiVersion: "2025-08-27.basil",
  httpClient: Stripe.createFetchHttpClient(),
});

// Maps Stripe Price IDs to our internal plan IDs
const planIdByPriceId = {
  [Deno.env.get("STRIPE_CLASSIC_PLAN_PRICE_ID")!]: "plan_classic",
  [Deno.env.get("STRIPE_PRO_PLAN_PRICE_ID")!]: "plan_pro",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get user ID from JWT
    const authHeader = req.headers.get("Authorization")!;
    const jwt = authHeader.replace("Bearer ", "");
    const [_header, payload, _signature] = jwt.split(".");
    const userId = JSON.parse(atob(payload)).sub;

    if (!userId) {
      throw new Error("User not authenticated.");
    }

    // Get stripe_customer_id from the user's profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    if (profileError || !profile || !profile.stripe_customer_id) {
      console.log(`No Stripe customer ID found for user ${userId}.`);
      return new Response(JSON.stringify({ active: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // List active subscriptions for the customer
    const { data: subscriptions } = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "active",
      limit: 1,
    });

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ active: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const activeSubscription = subscriptions[0];
    const priceId = activeSubscription.items.data[0].price.id;
    const planId = planIdByPriceId[priceId];

    const responsePayload = {
      active: true,
      planId: planId,
      expiresAt: activeSubscription.current_period_end, // Unix timestamp
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in get-subscription-details function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});