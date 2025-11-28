import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.15.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WARRIORPLUS_SECURITY_KEY = Deno.env.get("WARRIORPLUS_SECURITY_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const postData = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
        postData.set(key, value.toString());
    }

    // 1. Verification
    const receivedKey = postData.get("WP_SECURITYKEY");
    if (!WARRIORPLUS_SECURITY_KEY || receivedKey !== WARRIORPLUS_SECURITY_KEY) {
      console.error("WarriorPlus IPN verification failed. Key mismatch or not set.");
      return new Response(JSON.stringify({ status: "error", error: "IPN Verification Failed" }), {
        status: 200, // Always return 200 OK
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Extract Data
    const action = postData.get("WP_ACTION");
    const buyerEmail = postData.get("WP_BUYER_EMAIL");
    const productName = postData.get("WP_ITEM_NAME");
    const productId = postData.get("WP_ITEM_NUMBER");

    // We only care about sales for now
    if (action !== 'sale') {
        return new Response(JSON.stringify({ status: "success", message: `IPN action '${action}' ignored.` }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
    
    // --- Business Logic Placeholder ---
    // Here we will:
    // 1. Initialize Supabase Admin Client
    // 2. Check if user with `buyerEmail` exists.
    // 3. If user exists, update their plan based on `productId`.
    // 4. If user does not exist, create a new user and trigger the "create password" email.
    // 5. Update their profile with the purchased plan.
    console.log(`Processing sale for ${buyerEmail}, product: ${productName} (${productId})`);


    const responsePayload = {
      status: "success",
      message: "IPN received and verified. Logic pending implementation.",
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error processing WarriorPlus IPN:", error);
    return new Response(
      JSON.stringify({ status: "error", error: error.message }),
      {
        status: 200, // Always return 200 OK
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});