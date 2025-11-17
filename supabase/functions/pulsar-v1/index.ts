import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createPrompt, PromptContext } from "./services/promptService.ts";

console.log("[PULSAR_V1_LOG] Function cold start. Initializing...");

// Helper function for retries with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
  shouldRetry: (error: any) => boolean = (e) => e.message.includes("503"),
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && shouldRetry(error)) {
      console.log(
        `[PULSAR_V1_LOG] Retrying after ${delay}ms... (${retries} retries left)`,
      );
      await new Promise((res) => setTimeout(res, delay));
      return withRetry(fn, retries - 1, delay * 2, shouldRetry);
    }
    throw error;
  }
}

serve(async (req) => {
  console.log(`[PULSAR_V1_LOG] Request received. Method: ${req.method}`);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      rawText,
      contentLanguage = "English",
      hashtagLanguage = "English",
      linkedInCharCount,
      twitterCharCount,
      instagramCharCount,
      threadsCharCount,
      facebookCharCount,
      discordCharCount,
      telegramCharCount,
      promptText,
      targetNetwork,
      shouldTruncate,
    } = await req.json();

    console.log(
      `[PULSAR_V1_LOG] Processing request for network: ${targetNetwork}. Has Raw Text: ${!!rawText}`,
    );

    if (!rawText) {
      throw new Error("rawText is required for content generation.");
    }
    if (!targetNetwork || typeof targetNetwork !== "string") {
      throw new Error("A single target network string is required");
    }

    const pulseCost = 1; // Generation always costs 1 pulse
    console.log(`[PULSAR_V1_LOG] Determined pulse cost for operation: ${pulseCost}`);

    // 1. Authenticate user and CHECK pulses
    console.log("[PULSAR_V1_LOG] Authenticating user...");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error("User not found.");
    }
    console.log(`[PULSAR_V1_LOG] User authenticated: ${user.id}`);

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      console.error(
        "[PULSAR_V1_LOG] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set.",
      );
      throw new Error("Server configuration error.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceKey,
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("monthly_pulses_remaining")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("[PULSAR_V1_LOG] Profile error:", profileError);
      throw new Error("Could not retrieve user profile.");
    }
    console.log(
      `[PULSAR_V1_LOG] User profile loaded. Pulses remaining: ${profile.monthly_pulses_remaining}`,
    );

    if (profile.monthly_pulses_remaining < pulseCost) {
      throw new Error(
        `You need ${pulseCost} pulse for this generation, but you only have ${profile.monthly_pulses_remaining}.`,
      );
    }

    // 2. AI Content Generation
    console.log("[PULSAR_V1_LOG] Preparing prompts for AI model.");
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const cleanedText = rawText.replace(/\s\s+/g, " ").trim();
    const title = cleanedText.split("\n")[0].trim().substring(0, 100);

    const promptContext: PromptContext = {
      contentLanguage,
      hashtagLanguage,
      title,
      cleanedText,
    };

    const charLimits: { [key: string]: number } = {
      linkedin: linkedInCharCount > 0 ? linkedInCharCount : 3000,
      twitter: twitterCharCount > 0 ? twitterCharCount : 280,
      instagram: instagramCharCount > 0 ? instagramCharCount : 500,
      threads: threadsCharCount > 0 ? threadsCharCount : 500,
      facebook: facebookCharCount > 0 ? facebookCharCount : 2000,
      telegram: telegramCharCount || 4096,
      discord: discordCharCount || 2000,
    };

    const supportedNetworks = Object.keys(charLimits);
    if (!supportedNetworks.includes(targetNetwork)) {
      throw new Error(
        `Invalid or unsupported target network: ${targetNetwork}. Supported networks are: ${supportedNetworks.join(", ")}`,
      );
    }

    const promptContent = await createPrompt(
      targetNetwork as any,
      charLimits[targetNetwork as keyof typeof charLimits],
      promptContext,
      promptText,
    );

    if (!promptContent) {
      throw new Error(
        `Invalid or unsupported target network: ${targetNetwork}`,
      );
    }

    console.log(
      `[PULSAR_V1_LOG] --- Prompt Sent to AI for ${targetNetwork.toUpperCase()} ---`,
    );
    console.log(promptContent);
    console.log("-------------------------------------");

    const charLimit = charLimits[targetNetwork as keyof typeof charLimits] || 2000;
    const maxOutputTokens = Math.ceil(charLimit / (shouldTruncate ? 4 : 2.5));
    console.log(
      `[PULSAR_V1_LOG] Applying maxOutputTokens: ${maxOutputTokens} for network: ${targetNetwork}`,
    );

    const result = await withRetry(() =>
      model.generateContent({
        contents: [{ parts: [{ text: promptContent }] }],
        generationConfig: { maxOutputTokens },
      }),
    );

    console.log(
      `[PULSAR_V1_LOG] Content for ${targetNetwork.toUpperCase()} generated.`,
    );

    const generatedContent: { [key: string]: string } = {};
    generatedContent[targetNetwork] = result.response.text();

    console.log(
      `[PULSAR_V1_LOG] ${targetNetwork.toUpperCase()} Final Post:`,
      generatedContent[targetNetwork],
    );
    console.log("-------------------------------------");

    // 3. Charge Pulse
    console.log("[PULSAR_V1_LOG] Calling RPC to charge pulse for generation...");
    const { error: rpcError } = await supabaseAdmin.rpc(
      "charge_pulse_for_generation",
      {
        p_user_id: user.id,
        p_pulse_cost: pulseCost,
      },
    );

    if (rpcError) {
      console.error("[PULSAR_V1_LOG] RPC error charging pulse:", rpcError.message);
      throw new Error("Failed to charge pulse for content generation.");
    }
    console.log(
      `[PULSAR_V1_LOG] RPC success. ${pulseCost} pulse charged for user: ${user.id}`,
    );

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Content generated successfully!",
        generatedContent: generatedContent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[PULSAR_V1_LOG] Error in function handler:", errorMessage);
    console.error("[PULSAR_V1_LOG] Full error object:", error);

    if (
      errorMessage.includes("429 Too Many Requests") ||
      errorMessage.includes("QuotaFailure") ||
      errorMessage.includes("503")
    ) {
      const retryMatch = errorMessage.match(/"retryDelay":\s*"(\d+)s"/);
      let userMessage =
        "AI model is currently overloaded or unavailable. Please wait a moment and try again.";

      if (retryMatch && retryMatch[1]) {
        const delaySeconds = retryMatch[1];
        userMessage = `AI model request limit exceeded. Please wait ${delaySeconds} seconds and try again.`;
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