import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.5";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization")!;
    const jwt = authHeader.replace("Bearer ", "");
    const [_header, payload, _signature] = jwt.split(".");
    const userId = JSON.parse(atob(payload)).sub;

    if (!userId) {
      throw new Error("User not authenticated.");
    }
    console.log(`[get-subscription-details] Processing for user: ${userId}`);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("plan_type, plan_expires_at")
      .eq("id", userId)
      .single();

    if (profileError) {
      throw new Error(
        `Could not retrieve profile for user ${userId}: ${profileError.message}`,
      );
    }
    console.log("[get-subscription-details] Fetched profile:", profile);

    const now = new Date();
    const expiresAtRaw = profile.plan_expires_at;
    const expiresAtDate = expiresAtRaw ? new Date(expiresAtRaw) : null;

    console.log(`[get-subscription-details] Raw expiresAt from DB: ${expiresAtRaw}`);
    console.log(
      `[get-subscription-details] Parsed expiresAt Date object: ${expiresAtDate?.toISOString()}`,
    );
    console.log(`[get-subscription-details] Current Date object: ${now.toISOString()}`);

    const isActive = expiresAtDate && expiresAtDate > now;
    console.log(
      `[get-subscription-details] Final 'isActive' calculation result: ${isActive}`,
    );

    if (isActive) {
      const responsePayload = {
        active: true,
        planId: profile.plan_type,
        expiresAt: Math.floor(expiresAtDate.getTime() / 1000),
      };
      return new Response(JSON.stringify(responsePayload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      const responsePayload = { active: false };
      return new Response(JSON.stringify(responsePayload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    console.error("Error in get-subscription-details function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
