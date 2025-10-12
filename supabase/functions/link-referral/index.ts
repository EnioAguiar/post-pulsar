import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

console.log("`link-referral` function initialized");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { referral_code } = await req.json();
    if (!referral_code) {
      throw new Error("Referral code is missing.");
    }
    console.log(`Received request to link code: ${referral_code}`);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header.");
    }
    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser(jwt);
    if (!user) {
      throw new Error("Invalid user.");
    }
    const referredId = user.id;

    console.log(`Searching for referrer with code: ${referral_code}`);
    const { data: referrerProfile, error: referrerError } = await supabaseAdmin
      .from("profiles")
      .select("id") // Corrected from 'user_id' to 'id'
      .eq("referral_code", referral_code)
      .single();

    if (referrerError) {
      console.error(
        "Error querying for referrer profile:",
        JSON.stringify(referrerError, null, 2),
      );
    }

    if (referrerError || !referrerProfile) {
      console.error(
        `Referrer not found for code: ${referral_code}. Profile data was:`,
        referrerProfile,
      );
      return new Response(
        JSON.stringify({ message: "Processed, but no referrer found." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }
    const referrerId = referrerProfile.id; // Corrected from .user_id to .id

    if (referrerId === referredId) {
      console.log("User tried to refer themselves.");
      return new Response(JSON.stringify({ message: "Processed." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(
      `Attempting to insert referral: ${referrerId} -> ${referredId}`,
    );
    const { error: insertError } = await supabaseAdmin
      .from("referrals")
      .insert({
        referrer_id: referrerId,
        referred_id: referredId,
      });

    if (insertError && insertError.code !== "23505") {
      console.error(
        "Error inserting referral:",
        JSON.stringify(insertError, null, 2),
      );
      throw insertError;
    }

    console.log(`Referral linked successfully: ${referrerId} -> ${referredId}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Critical error in link-referral function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
