import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createPrompt,
  PromptContext,
} from "./services/promptService.ts";

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
      targetNetworks,
    } = await req.json();

    console.log(
      `[PULSAR_LOG] Processing request. URL: ${url}, Has Raw Text: ${!!rawText}`,
    );

    if (!url && !rawText) {
      throw new Error("Either URL or raw text is required");
    }
    if (
      !targetNetworks ||
      !Array.isArray(targetNetworks) ||
      targetNetworks.length === 0
    ) {
      throw new Error("Target networks are required");
    }

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

    const { data: { user } } = await supabaseClient.auth.getUser();
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

    if (profile.monthly_pulses_remaining <= 0) {
      throw new Error("You do not have enough pulses to generate new content.");
    }

    // 2. Content Extraction
    let title = "";
    let cleanedText = "";

    if (rawText) {
      console.log("[PULSAR_LOG] Using raw text input.");
      cleanedText = rawText.replace(/\s\s+/g, " ").trim();
      // Attempt to extract a title from the first few lines
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
      if (text.length <= limit) {
        return text;
      }

      const lines = text.split('\n');
      let lastHashtagLineIndex = -1;

      // Find the last line that starts with a hashtag
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim().startsWith('#')) {
          lastHashtagLineIndex = i;
        } else if (lines[i].trim() !== '') {
          // Stop if we hit a non-empty line that isn't a hashtag line
          break;
        }
      }

      let body = text;
      let hashtagBlock = '';

      if (lastHashtagLineIndex !== -1) {
        // Found a hashtag block
        hashtagBlock = lines.slice(lastHashtagLineIndex).join('\n');
        body = lines.slice(0, lastHashtagLineIndex).join('\n').trim();
      }
      
      // The limit for the body is the total limit minus the space for the hashtags
      // and two newline characters.
      const bodyLimit = limit - (hashtagBlock.length + (hashtagBlock ? 2 : 0));

      if (body.length > bodyLimit) {
        let truncatedBody = body.substring(0, bodyLimit - 3); // Space for "..."
        const lastSpace = truncatedBody.lastIndexOf(' ');
        if (lastSpace > 0) {
          truncatedBody = truncatedBody.substring(0, lastSpace);
        }
        body = truncatedBody + '...';
      }

      if (hashtagBlock) {
        return `${body}\n\n${hashtagBlock}`;
      } else {
        return body;
      }
    };

    const linkedInCharLimit = linkedInCharCount > 0 ? linkedInCharCount : 3000;
    const twitterCharLimit = twitterCharCount > 0 ? twitterCharCount : 280;
    const instagramCharLimit =
      instagramCharCount > 0 ? instagramCharCount : 500;
    const threadsCharLimit = threadsCharCount > 0 ? threadsCharCount : 500;
    const facebookCharLimit = facebookCharCount > 0 ? facebookCharCount : 2000;
    const telegramCharLimit = 4096; // Telegram's actual limit
    const discordCharLimit = 2000; // Discord's actual limit

    const allPrompts = {
      linkedin: createPrompt("linkedin", linkedInCharLimit, promptContext, promptText),
      twitter: createPrompt("twitter", twitterCharLimit, promptContext, promptText),
      instagram: createPrompt("instagram", instagramCharLimit, promptContext, promptText),
      threads: createPrompt("threads", threadsCharLimit, promptContext, promptText),
      facebook: createPrompt("facebook", facebookCharLimit, promptContext, promptText),
      telegram: createPrompt("telegram", telegramCharLimit, promptContext, promptText),
      discord: createPrompt("discord", discordCharLimit, promptContext, promptText),
    };

    const prompts = Object.fromEntries(
      Object.entries(allPrompts).filter(([network]) =>
        targetNetworks.includes(network),
      ),
    );

    console.log("[PULSAR_LOG] --- Prompts Sent to AI ---");
    Object.entries(prompts).forEach(([network, promptContent]) => {
      console.log(`[PULSAR_LOG] Prompt for: ${network.toUpperCase()}`);
      console.log(promptContent);
      console.log("-------------------------------------");
    });

    console.log(
      `[PULSAR_LOG] Sending ${Object.keys(prompts).length} requests to AI model sequentially...`,
    );
    const results: { [key: string]: any } = {};
    for (const network of Object.keys(prompts)) {
      console.log(
        `[PULSAR_LOG] Generating content for: ${network.toUpperCase()}`,
      );
      const promptContent = prompts[network as keyof typeof prompts];
      results[network] = await withRetry(() =>
        model.generateContent(promptContent),
      );
      console.log(
        `[PULSAR_LOG] Content for ${network.toUpperCase()} generated.`,
      );
    }
    console.log("[PULSAR_LOG] All AI model responses received.");

    const charLimits: { [key: string]: number } = {
      linkedin: linkedInCharLimit,
      twitter: twitterCharLimit,
      instagram: instagramCharLimit,
      threads: threadsCharLimit,
      facebook: facebookCharLimit,
      telegram: telegramCharLimit,
      discord: discordCharLimit,
    };

    const generatedContent: { [key: string]: string } = {};
    console.log("[PULSAR_LOG] --- Raw AI Responses & Truncation ---");
    for (const network of Object.keys(results)) {
      const resultText = results[network].response.text();
      console.log(
        `[PULSAR_LOG] ${network.toUpperCase()} Raw Response:`,
        resultText,
      );
      generatedContent[network] = truncateText(resultText, charLimits[network]);
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
        p_pulse_cost: targetNetworks.length,
      },
    );

    if (rpcError) {
      console.error("[PULSAR_LOG] RPC error charging pulse:", rpcError.message);
      throw new Error("Failed to charge pulse for content generation.");
    }
    console.log(`[PULSAR_LOG] RPC success. Pulses charged for user: ${user.id}`);

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
