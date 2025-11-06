import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { corsHeaders } from "../_shared/cors.ts";

// --- Mappings ---
const discountTierCountries = ["AR", "MX", "CL", "CO", "PE", "PK", "NG", "BD", "ID", "PH", "TR"];

// --- Helper Functions ---
function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const connInfo = (req as any).remoteAddr;
  if (connInfo && connInfo.hostname) {
    return connInfo.hostname;
  }
  return null;
}

async function getCountryCodeFromIp(ip: string): Promise<string | null> {
  if (ip === "127.0.0.1") return "AR"; // Force Argentina for local discount tests
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,countryCode`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.status === 'success' ? data.countryCode : null;
  } catch (e) {
    console.error("[create-payment-intent] Error fetching IP location:", e);
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

    const { priceId, referral } = await req.json();

    if (!priceId) {
      throw new Error("priceId is required.");
    }

    const authHeader = req.headers.get("Authorization")!;
    const jwt = authHeader.replace("Bearer ", "");
    const [_header, payload, _signature] = jwt.split(".");
    const userId = JSON.parse(atob(payload)).sub;

    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    if (profileError) throw profileError;

    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ 
        email: JSON.parse(atob(payload)).email,
        metadata: { user_id: userId },
       });
      customerId = customer.id;
      await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
    }

    // --- Coupon Logic ---
    const clientIp = getClientIp(req);
    const countryCode = clientIp ? await getCountryCodeFromIp(clientIp) : null;
    const applyDiscount = countryCode && discountTierCountries.includes(countryCode);

    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${Deno.env.get("SITE_URL")}/app/billing?purchase_success=true`,
      cancel_url: `${Deno.env.get("SITE_URL")}/app/billing`,
      metadata: {
        user_id: userId,
        price_id: priceId,
      },
    };

    // Add referral to metadata if it exists
    if (referral) {
      sessionOptions.metadata.promotekit_referral = referral;
    }

    if (applyDiscount) {
        const couponId = Deno.env.get("STRIPE_DISCOUNT_COUPON_ID");
        if (couponId) {
            sessionOptions.discounts = [{ coupon: couponId }];
            console.log(`[create-payment-intent] Applied coupon ${couponId} for user from ${countryCode}`);
        }
    }

    const session = await stripe.checkout.sessions.create(sessionOptions);

    return new Response(JSON.stringify({ checkoutUrl: session.url }), {
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
