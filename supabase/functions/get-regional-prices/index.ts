import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import Stripe from "stripe";

// Initialize Stripe client
const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY")!,
  {
    apiVersion: "2025-08-27.basil",
    httpClient: Stripe.createFetchHttpClient(),
  });

// --- Mappings ---

const countryToCurrency = {
  BR: "brl",
  IN: "inr",
  AE: "aed",
  QA: "aed",
};

const discountTierCountries = ["AR", "MX", "CL", "CO", "PE", "PK", "NG", "BD", "ID", "PH", "TR"];

const products = [
    { id: "plan_classic", key: "CLASSIC" },
    { id: "plan_pro", key: "PRO" },
    { id: "pulse_pack_100", key: "PULSE_100" },
    { id: "pulse_pack_250", key: "PULSE_250" },
    { id: "pulse_pack_600", key: "PULSE_600" },
];

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
    console.error("[get-regional-prices] Error fetching IP location:", e);
    return null;
  }
}

function getPriceIdFromEnv(productKey: string, currency: string): string | null {
    const envVar = `STRIPE_PRICE_${productKey}_${currency.toUpperCase()}`;
    return Deno.env.get(envVar) || null;
}

// --- Edge Function ---

serve(async (req) => {
  console.log("[get-regional-prices] Function invoked.");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const clientIp = getClientIp(req);
    const countryCode = clientIp ? await getCountryCodeFromIp(clientIp) : null;
    console.log(`[get-regional-prices] Detected IP: ${clientIp}, Country: ${countryCode}`);

    const targetCurrency = (countryCode && countryToCurrency[countryCode]) || null;
    const applyDiscount = countryCode && discountTierCountries.includes(countryCode);
    console.log(`[get-regional-prices] Target Currency: ${targetCurrency}, Apply Discount: ${applyDiscount}`);

    const regionalPrices = {};

    const pricePromises = products.map(product => {
      let priceId: string | null = null;
      if (targetCurrency) {
        priceId = getPriceIdFromEnv(product.key, targetCurrency);
      } else {
        priceId = getPriceIdFromEnv(product.key, "usd");
      }
      console.log(`[get-regional-prices] For product ${product.id}, found Price ID: ${priceId}`);

      if (priceId) {
        return stripe.prices.retrieve(priceId).then(stripePrice => ({ productId: product.id, stripePrice }));
      }
      return Promise.resolve({ productId: product.id, stripePrice: null });
    });

    const results = await Promise.all(pricePromises);
    console.log("[get-regional-prices] Results from Promise.all:", results);

    for (const { productId, stripePrice } of results) {
        if (stripePrice) {
            let priceData = {
                priceId: stripePrice.id,
                amount: stripePrice.unit_amount,
                currency: stripePrice.currency,
            };

            if (applyDiscount && priceData.currency === 'usd') {
                priceData.amount = Math.round(priceData.amount * 0.5);
                console.log(`[get-regional-prices] Applied 50% discount to ${productId}. New amount: ${priceData.amount}`);
            }
            regionalPrices[productId] = priceData;
        } else {
            regionalPrices[productId] = null;
        }
    }
    console.log("[get-regional-prices] Final prices object:", regionalPrices);

    return new Response(JSON.stringify(regionalPrices), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[get-regional-prices] CATCH BLOCK ERROR:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
