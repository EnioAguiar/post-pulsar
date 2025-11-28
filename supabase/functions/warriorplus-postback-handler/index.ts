import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.15.0";
import Stripe from "https://esm.sh/stripe@11.1.0";
import crypto from "node:crypto";

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
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Extract Data & Check Action
    const action = postData.get("WP_ACTION");
    if (action !== 'sale') {
      return new Response(JSON.stringify({ status: "success", message: `IPN action '${action}' ignored.` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buyerEmail = postData.get("WP_BUYER_EMAIL");
    const buyerName = postData.get("WP_BUYER_NAME");
    const productId = postData.get("WP_ITEM_NUMBER");

    if (!buyerEmail || !productId) {
        throw new Error("Missing buyer email or product ID from WarriorPlus IPN.");
    }

    // 3. Product Mapping
    const productMap = {
      'wso_n1fhb9': { plan: 'pro', pulses: 500 }
      // Add other products here in the future
    };

    const planDetails = productMap[productId];

    if (!planDetails) {
      throw new Error(`Product ID '${productId}' not found in product map.`);
    }

    // 4. Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 5. Find or Create User
    let userId: string;

    const { data: existingUser, error: findError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('email', buyerEmail)
      .single();

    if (findError && findError.code !== 'PGRST116') { // PGRST116 = 0 rows
        throw new Error(`Error looking up user: ${findError.message}`);
    }

    if (existingUser) {
      userId = existingUser.user_id;
      console.log(`User ${buyerEmail} found. Granting plan.`);
    } else {
      console.log(`User ${buyerEmail} not found. Creating new user.`);
      const { data: newUser, error: creationError } = await supabaseAdmin.auth.admin.createUser({
        email: buyerEmail,
        email_confirm: true,
        user_metadata: { full_name: buyerName }
      });

      if (creationError) {
        throw new Error(`Error creating user: ${creationError.message}`);
      }
      userId = newUser.user.id;
      console.log(`New user created with ID: ${userId}`);
    }

    // 6. Grant Plan
    const now = new Date();
    const expiresAt = new Date(now.setDate(now.getDate() + 30)).toISOString();

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        plan_type: planDetails.plan,
        pulses: planDetails.pulses,
        plan_expires_at: expiresAt
      })
      .eq('user_id', userId);

    if (updateError) {
        throw new Error(`Failed to update profile for user ${userId}: ${updateError.message}`);
    }

    console.log(`Successfully granted plan '${planDetails.plan}' to user ${userId}.`);

    return new Response(JSON.stringify({ status: "success" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error processing WarriorPlus IPN:", error);
    return new Response(
      JSON.stringify({ status: "error", error: error.message }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});