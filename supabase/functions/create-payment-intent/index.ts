import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { corsHeaders } from "../_shared/cors.ts";
import { handleOneTimePurchase } from "./handlers/one-time-purchase.ts";
import { handlePlanPurchase } from "./handlers/plan-purchase.ts";

// Helper to get the first IP from the x-forwarded-for header
function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // The header can contain a comma-separated list of IPs. The client IP is typically the first one.
    return forwardedFor.split(',')[0].trim();
  }
  return null;
}

// Helper to get country code from IP
async function getCountryCodeFromIp(ip: string): Promise<string | null> {
  try {
    // We only request the fields we need to be efficient.
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,countryCode`);
    if (!response.ok) {
      console.error(`ip-api.com request failed with status: ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (data.status === 'success') {
      return data.countryCode;
    } else {
      console.warn(`ip-api.com returned failure for IP ${ip}: ${data.message}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching geolocation data: ${error.message}`);
    return null;
  }
}

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

    const { productId } = await req.json();

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

    // Get country code from client IP
    const clientIp = getClientIp(req);
    const countryCode = clientIp ? await getCountryCodeFromIp(clientIp) : null;
    console.log(`[create-payment-intent] Detected Country Code: ${countryCode} for IP: ${clientIp}`);

    let responsePayload: {
      clientSecret?: string | null;
      checkoutUrl?: string | null;
    } = {};

    if (productId.startsWith("plan_")) {
      const result = await handlePlanPurchase(
        supabaseAdmin,
        stripe,
        userId,
        productId,
        countryCode,
      );
      responsePayload = { checkoutUrl: result.checkoutUrl };
    } else {
      // Generate idempotency key on the server to ensure uniqueness
      const idempotencyKey = crypto.randomUUID();
      console.log(
        `[create-payment-intent] Generated idempotencyKey: ${idempotencyKey}`,
      );

      const result = await handleOneTimePurchase(
        supabaseAdmin,
        stripe,
        userId,
        productId,
        idempotencyKey,
        countryCode,
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
