import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// --- Shared Pricing Logic ---

const productPrices = {
  plan_classic: 900,
  plan_pro: 2900,
  pulse_pack_100: 500,
  pulse_pack_250: 1000,
  pulse_pack_600: 2000,
};

const pricingTiers = {
  tier3: ["IN", "ID", "PK", "NG", "BD"], // 75% discount
  tier2: ["BR", "MX", "RU", "TR"], // 50% discount
};

function getAdjustedPrice(price: number, countryCode: string | null): number {
  if (!countryCode) return price;

  if (pricingTiers.tier3.includes(countryCode)) {
    return price * 0.25; // 75% discount
  }

  if (pricingTiers.tier2.includes(countryCode)) {
    return price * 0.5; // 50% discount
  }

  return price; // Tier 1, no discount
}

// --- Edge Function ---

function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return null;
}

async function getCountryCodeFromIp(ip: string): Promise<string | null> {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,countryCode`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.status === 'success' ? data.countryCode : null;
  } catch (e) {
    console.error("Error fetching IP location:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const clientIp = getClientIp(req);
    const countryCode = clientIp ? await getCountryCodeFromIp(clientIp) : null;

    const regionalPrices = {};
    for (const productId in productPrices) {
      const basePrice = productPrices[productId];
      regionalPrices[productId] = Math.round(getAdjustedPrice(basePrice, countryCode));
    }

    return new Response(JSON.stringify(regionalPrices), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
