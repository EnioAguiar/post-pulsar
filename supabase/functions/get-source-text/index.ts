import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("[GET_SOURCE_TEXT_LOG] Function cold start. Initializing...");

serve(async (req) => {
  console.log(`[GET_SOURCE_TEXT_LOG] Request received. Method: ${req.method}`);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url, rawText } = await req.json();

    console.log(
      `[GET_SOURCE_TEXT_LOG] Processing request. URL: ${url}, Has Raw Text: ${!!rawText}`,
    );

    if (!url && !rawText) {
      throw new Error("Either URL or raw text is required");
    }
    if (rawText) {
      // If rawText is provided, no need to fetch/transcribe, just return it.
      return new Response(
        JSON.stringify({
          status: "success",
          cleanedText: rawText.replace(/\s\s+/g, " ").trim(),
          pulseCost: 0, // No cost for raw text input to this function
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // --- 1. AUTHENTICATE USER ---
    console.log("[GET_SOURCE_TEXT_LOG] Authenticating user...");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("User not found.");
    console.log(`[GET_SOURCE_TEXT_LOG] User authenticated: ${user.id}`);

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      console.error(
        "[GET_SOURCE_TEXT_LOG] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set.",
      );
      throw new Error("Server configuration error.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceKey,
    );

    // --- 2. DETERMINE PULSE COST ---
    const pulseCost = 1; // Always 1 for scraping, as transcription is removed

    console.log(
      `[GET_SOURCE_TEXT_LOG] Determined pulse cost for source extraction: ${pulseCost}`,
    );

    // --- 3. CHECK USER PULSES ---
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("monthly_pulses_remaining") // weekly_transcriptions_remaining removed
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("[GET_SOURCE_TEXT_LOG] Profile error:", profileError);
      throw new Error("Could not retrieve user profile.");
    }

    if (profile.monthly_pulses_remaining < pulseCost) {
      throw new Error(
        `You need ${pulseCost} pulses for this action, but you only have ${profile.monthly_pulses_remaining}.`,
      );
    }

    // --- 4. EXTRACT CONTENT ---
    let cleanedText = "";

    // Regular URL scraping is now the only path
    console.log(`[GET_SOURCE_TEXT_LOG] Starting scrape for URL: ${url}`);
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    let body = "";
    $("article, main, .post-content, .blog-post, section").each((i, el) => {
      const elementText = $(el).text().trim();
      if (elementText.length > body.length) body = elementText;
    });
    if (!body) body = $("body").text().trim();
    cleanedText = body.replace(/\s\s+/g, " ").trim();
    console.log(
      `[GET_SOURCE_TEXT_LOG] Scrape complete. Body length: ${cleanedText.length}`,
    );

    // --- 5. CHARGE PULSES ---
    console.log(
      `[GET_SOURCE_TEXT_LOG] Calling RPC to charge ${pulseCost} pulses for source extraction...`,
    );
    const { error: rpcError } = await supabaseAdmin.rpc(
      "charge_pulse_for_generation",
      { p_user_id: user.id, p_pulse_cost: pulseCost },
    );

    if (rpcError) {
      console.error(
        "[GET_SOURCE_TEXT_LOG] RPC error charging pulse:",
        rpcError.message,
      );
      throw new Error("Failed to charge pulse for source extraction.");
    }
    console.log(
      `[GET_SOURCE_TEXT_LOG] RPC success. ${pulseCost} pulses charged for user: ${user.id}`,
    );

    // --- 6. RETURN RESPONSE ---
    return new Response(
      JSON.stringify({
        status: "success",
        cleanedText: cleanedText,
        pulseCost: pulseCost,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error(
      "[GET_SOURCE_TEXT_LOG] Error in function handler:",
      errorMessage,
    );
    console.error("[GET_SOURCE_TEXT_LOG] Full error object:", error);

    if (
      errorMessage.includes("429 Too Many Requests") ||
      errorMessage.includes("QuotaFailure") ||
      errorMessage.includes("503")
    ) {
      const retryMatch = errorMessage.match(/"retryDelay":\s*"(\d+)s"/);
      let userMessage =
        "AI model is currently overloaded or unavailable. Please wait a moment and try again.";
      if (retryMatch && retryMatch[1]) {
        userMessage = `AI model request limit exceeded. Please wait ${retryMatch[1]} seconds and try again.`;
      }
      return new Response(
        JSON.stringify({
          status: "error",
          error: userMessage,
          errorCode: "AI_RATE_LIMIT_EXCEEDED",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    return new Response(
      JSON.stringify({ status: "error", error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }
});
