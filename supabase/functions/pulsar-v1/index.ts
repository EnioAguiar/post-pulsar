import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createPrompt, PromptContext } from "./services/promptService.ts";

console.log("[PULSAR_LOG] Function cold start. Initializing...");

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
        `[PULSAR_LOG] Retrying after ${delay}ms... (${retries} retries left)`,
      );
      await new Promise((res) => setTimeout(res, delay));
      return withRetry(fn, retries - 1, delay * 2, shouldRetry);
    }
    throw error;
  }
}

const isMediaUrl = (url: string) => {
  if (!url) return false;
  const mediaRegex = /(\.mp3|\.mp4|\.wav|\.mov)$|^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  return mediaRegex.test(url);
};

serve(async (req) => {
  console.log(`[PULSAR_LOG] Request received. Method: ${req.method}`);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      url,
      rawText, // New field for raw text input
      contentLanguage = "English",
      hashtagLanguage = "English",
      linkedInCharCount,
      twitterCharCount,
      instagramCharCount,
      threadsCharCount,
      facebookCharCount,
      promptText,
      targetNetwork,
      shouldTruncate,
    } = await req.json();

    console.log(
      `[PULSAR_LOG] Processing request for single network. URL: ${url}, Has Raw Text: ${!!rawText}, Network: ${targetNetwork}`,
    );

    if (!url && !rawText) {
      throw new Error("Either URL or raw text is required");
    }
    if (!targetNetwork || typeof targetNetwork !== "string") {
      throw new Error("A single target network string is required");
    }

    // Determine pulse cost early
    let pulseCost = 1;
    if (isMediaUrl(url)) {
      pulseCost = 2;
    }
    console.log(`[PULSAR_LOG] Determined pulse cost for operation: ${pulseCost}`);

    // 1. Authenticate user and CHECK pulses
    console.log("[PULSAR_LOG] Authenticating user...");
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
    if (!user) {
      throw new Error("User not found.");
    }
    console.log(`[PULSAR_LOG] User authenticated: ${user.id}`);

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      console.error(
        "[PULSAR_LOG] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set.",
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
      console.error("[PULSAR_LOG] Profile error:", profileError);
      throw new Error("Could not retrieve user profile.");
    }
    console.log(
      `[PULSAR_LOG] User profile loaded. Pulses remaining: ${profile.monthly_pulses_remaining}`,
    );

    if (profile.monthly_pulses_remaining < pulseCost) {
      throw new Error(
        `You need ${pulseCost} pulses for this action, but you only have ${profile.monthly_pulses_remaining}.`,
      );
    }

    // 2. Content Extraction
    let title = "";
    let cleanedText = "";

    if (isMediaUrl(url)) {
      console.log(`[PULSAR_LOG] Detected media URL: ${url}. Calling video-converter-service for transcription.`);
      const CONVERTER_SERVICE_URL = Deno.env.get("CONVERTER_SERVICE_URL");
      const CONVERTER_SERVICE_API_KEY = Deno.env.get("SERVICE_API_KEY");

      if (!CONVERTER_SERVICE_URL || !CONVERTER_SERVICE_API_KEY) {
        throw new Error("Converter service URL or API key is not configured.");
      }

      try {
        let converterUrl = CONVERTER_SERVICE_URL;
        if (!converterUrl.startsWith("http")) {
          converterUrl = `https://${converterUrl}`;
        }

        const transcribeResponse = await fetch(`${converterUrl}/transcribe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${CONVERTER_SERVICE_API_KEY}`,
          },
          body: JSON.stringify({ audioUrl: url }),
        });

        if (!transcribeResponse.ok) {
          const errorBody = await transcribeResponse.json();
          throw new Error(
            `Transcription service failed: ${transcribeResponse.status} - ${ 
              errorBody.error || JSON.stringify(errorBody) 
            }`,
          );
        }

        const transcribeResult = await transcribeResponse.json();
        if (transcribeResult.status === "success" && transcribeResult.text) {
          cleanedText = transcribeResult.text;
          title = `Transcription of ${new URL(url).pathname.split("/").pop()}`;
          console.log(
            `[PULSAR_LOG] Transcription successful. Text length: ${cleanedText.length}`,
          );
        } else {
          throw new Error(
            `Transcription service returned an error: ${ 
              transcribeResult.error || "Unknown error" 
            }`,
          );
        }
      } catch (transcriptionError) {
        console.error(
          "[PULSAR_LOG] Error calling transcription service:",
          transcriptionError,
        );
        throw new Error(
          `Failed to transcribe media: ${transcriptionError.message}`,
        );
      }
    } else if (rawText) {
      console.log("[PULSAR_LOG] Using raw text input.");
      cleanedText = rawText.replace(/\s\s+/g, " ").trim();
      title = rawText.split("\n")[0].trim().substring(0, 100);
    } else if (url) {
      console.log(`[PULSAR_LOG] Starting scrape for URL: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
      }
      const html = await response.text();
      const $ = cheerio.load(html);
      title = $("title").first().text() || $("h1").first().text();
      let body = "";
      $("article, main, .post-content, .blog-post, section").each((i, el) => {
        const elementText = $(el).text().trim();
        if (elementText.length > body.length) {
          body = elementText;
        }
      });
      if (!body) {
        body = $("body").text().trim();
      }
      cleanedText = body.replace(/\s\s+/g, " ").trim();
      console.log(
        `[PULSAR_LOG] Scrape complete. Title: '${title}'. Body length: ${cleanedText.length}`,
      );
    }

    // 3. AI Content Generation
    console.log("[PULSAR_LOG] Preparing prompts for AI model.");
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const promptContext: PromptContext = {
      contentLanguage,
      hashtagLanguage,
      title,
      cleanedText,
    };

    const truncateText = (text: string, limit: number): string => {
      const cleanedText = text.replace(/\s*\*\d+\s*$/, "").trim();
      if (cleanedText.length <= limit) {
        return cleanedText;
      }
      let truncated = cleanedText.substring(0, limit - 3);
      const lastSpace = truncated.lastIndexOf(" ");
      if (lastSpace > 0) {
        truncated = truncated.substring(0, lastSpace);
      }
      return truncated + "...";
    };

    const linkedInCharLimit = linkedInCharCount > 0 ? linkedInCharCount : 3000;
    const twitterCharLimit = twitterCharCount > 0 ? twitterCharCount : 280;
    const instagramCharLimit =
      instagramCharCount > 0 ? instagramCharCount : 500;
    const threadsCharLimit = threadsCharCount > 0 ? threadsCharCount : 500;
    const facebookCharLimit = facebookCharCount > 0 ? facebookCharCount : 2000;
    const telegramCharLimit = 4096;
    const discordCharLimit = 2000;

    const charLimits: { [key: string]: number } = {
      linkedin: linkedInCharLimit,
      twitter: twitterCharLimit,
      instagram: instagramCharLimit,
      threads: threadsCharLimit,
      facebook: facebookCharLimit,
      telegram: telegramCharLimit,
      discord: discordCharLimit,
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

    const prompts = { [targetNetwork]: promptContent };

    console.log(
      `[PULSAR_LOG] --- Prompt Sent to AI for ${targetNetwork.toUpperCase()} ---`,
    );
    console.log(prompts[targetNetwork]);
    console.log("-------------------------------------");

    console.log(
      `[PULSAR_LOG] Sending ${Object.keys(prompts).length} requests to AI model sequentially...`,
    );
    const results: { [key: string]: any } = {};
    for (const network of Object.keys(prompts)) {
      console.log(
        `[PULSAR_LOG] Generating content for: ${network.toUpperCase()}`,
      );
      const promptContent = prompts[network as keyof typeof prompts];
      const charLimit = charLimits[network as keyof typeof charLimits] || 2000;
      let generationConfig = {};

      if (shouldTruncate) {
        const maxOutputTokens = Math.ceil(charLimit / 4);
        console.log(
          `[PULSAR_LOG] Applying STRICT maxOutputTokens: ${maxOutputTokens} for network: ${network}`,
        );
        generationConfig = { maxOutputTokens };
      } else {
        const maxOutputTokens = Math.ceil(charLimit / 2.5);
        console.log(
          `[PULSAR_LOG] Applying GENEROUS maxOutputTokens: ${maxOutputTokens} for network: ${network}`,
        );
        generationConfig = { maxOutputTokens };
      }

      results[network] = await withRetry(() =>
        model.generateContent({
          contents: [{ parts: [{ text: promptContent }] }],
          generationConfig,
        }),
      );

      console.log(
        `[PULSAR_LOG] Content for ${network.toUpperCase()} generated.`,
      );
    }
    console.log("[PULSAR_LOG] All AI model responses received.");

    const generatedContent: { [key: string]: string } = {};
    console.log("[PULSAR_LOG] --- Raw AI Responses & Truncation ---");
    for (const network of Object.keys(results)) {
      const resultText = results[network].response.text();
      console.log(
        `[PULSAR_LOG] ${network.toUpperCase()} Raw Response:`,
        resultText,
      );
      if (shouldTruncate) {
        generatedContent[network] = truncateText(
          resultText,
          charLimits[network],
        );
      } else {
        generatedContent[network] = resultText;
      }
      console.log(
        `[PULSAR_LOG] ${network.toUpperCase()} Final Post:`,
        generatedContent[network],
      );
    }
    console.log("-------------------------------------");

    console.log("[PULSAR_LOG] Calling RPC to charge pulse for generation...");
    const { error: rpcError } = await supabaseAdmin.rpc(
      "charge_pulse_for_generation",
      {
        p_user_id: user.id,
        p_pulse_cost: pulseCost,
      },
    );

    if (rpcError) {
      console.error("[PULSAR_LOG] RPC error charging pulse:", rpcError.message);
      throw new Error("Failed to charge pulse for content generation.");
    }
    console.log(
      `[PULSAR_LOG] RPC success. ${pulseCost} pulses charged for user: ${user.id}`,
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
    console.error("[PULSAR_LOG] Error in function handler:", errorMessage);
    console.error("[PULSAR_LOG] Full error object:", error);

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