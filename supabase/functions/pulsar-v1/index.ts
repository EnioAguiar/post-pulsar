import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // If no retries left or the error is not retryable, throw it
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
      contentLanguage = "English",
      hashtagLanguage = "English",
      linkedInCharCount,
      twitterCharCount,
      instagramCharCount,
      threadsCharCount,
      facebookCharCount,
      promptText, // User-provided prompt text
      targetNetworks, // New array of selected networks
    } = await req.json();
    console.log(`[PULSAR_LOG] Processing request for URL: ${url}`);

    if (!url) {
      throw new Error("URL is required");
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

    if (profile.monthly_pulses_remaining <= 0) {
      throw new Error("You do not have enough pulses to generate new content.");
    }

    // 2. Scraping
    console.log(`[PULSAR_LOG] Starting scrape for URL: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    const title = $("title").first().text() || $("h1").first().text();
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
    const cleanedText = body.replace(/\s\s+/g, " ").trim();
    console.log(
      `[PULSAR_LOG] Scrape complete. Title: '${title}'. Body length: ${cleanedText.length}`,
    );

    // 3. AI Content Generation
    console.log("[PULSAR_LOG] Preparing prompts for AI model.");
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const createPrompt = (
      network: string,
      charCount: number,
      customPrompt?: string,
    ) => {
      const networkProfiles: Record<
        string,
        { name: string; tone: string; hashtags: string }
      > = {
        linkedin: {
          name: "LinkedIn",
          tone: "Professional and engaging. Start with a strong hook, develop in 2-4 short paragraphs, and end with a question.",
          hashtags: "3 to 5 relevant hashtags",
        },
        twitter: {
          name: "Twitter/X",
          tone: "Direct, short, and impactful. Start with a curiosity-generating hook.",
          hashtags: "2 to 3 relevant hashtags",
        },
        instagram: {
          name: "Instagram",
          tone: "Visual and appealing. The caption should complement an image. Use short paragraphs and line breaks.",
          hashtags: "5 to 10 relevant and popular hashtags",
        },
        threads: {
          name: "Threads",
          tone: "Conversational and informative, more casual than LinkedIn. Use short paragraphs and ask an open-ended question.",
          hashtags: "1 to 3 hashtags",
        },
        facebook: {
          name: "Facebook",
          tone: "Friendly and informative. Can be slightly longer and more detailed than Instagram. Use well-spaced paragraphs and end with a call to action or question.",
          hashtags: "2 to 4 relevant hashtags",
        },
      };

      const profile = networkProfiles[network];
      const lowerBound = Math.max(charCount - 100, 1);
      
      const styleGuideline = customPrompt 
        ? `**USER INSTRUCTION (MOST IMPORTANT):**\n---\n${customPrompt}\n---`
        : `**CONTENT GUIDELINES:**\n- **Tone of Voice:** ${profile.tone}`;

      const prompt = `
        You are an expert social media copywriter. Your task is to adapt the provided article for a ${profile.name} post.

        **IMPORTANT TASK BREAKDOWN:**
        1.  **WRITE POST BODY:** First, write the main body of the post. It must be in **${contentLanguage}** and have a character count between **${lowerBound} and ${charCount} characters**.
        2.  **ADD HASHTAGS:** After the post body, on a new line, you MUST add ${profile.hashtags}. The hashtags MUST be in **${hashtagLanguage}**.

        **RESPONSE FORMATTING RULES:**
        - Your response must contain ONLY the generated post text and its hashtags.
        - Do not include introductions like "Here is the post:".
        - There must be a blank line between the post body and the hashtags.

        ${styleGuideline}

        **Original Article to use as a base:**
        ---
        Title: ${title}
        Content:
        ${cleanedText}
        ---

        Now, generate the post for ${profile.name} following all rules precisely.
      `;

      return prompt;
    };

    const truncateText = (text: string, limit: number): string => {
      // This function is less critical now but kept as a fallback.
      const parts = text.split("\n");
      const body = parts[0];
      if (body.length > limit) {
        const lastPeriodIndex = body.substring(0, limit).lastIndexOf(".");
        if (lastPeriodIndex > 0) {
          parts[0] = body.substring(0, lastPeriodIndex + 1);
        } else {
          parts[0] = body.substring(0, limit - 3) + "...";
        }
      }
      return parts.join("\n");
    };

    const linkedInCharLimit = linkedInCharCount > 0 ? linkedInCharCount : 1000;
    const twitterCharLimit = twitterCharCount > 0 ? twitterCharCount : 280;
    const instagramCharLimit =
      instagramCharCount > 0 ? instagramCharCount : 500;
    const threadsCharLimit = threadsCharCount > 0 ? threadsCharCount : 500;
    const facebookCharLimit = facebookCharCount > 0 ? facebookCharCount : 1200;

    const allPrompts = {
      linkedin: createPrompt("linkedin", linkedInCharLimit, promptText),
      twitter: createPrompt("twitter", twitterCharLimit, promptText),
      instagram: createPrompt("instagram", instagramCharLimit, promptText),
      threads: createPrompt("threads", threadsCharLimit, promptText),
      facebook: createPrompt("facebook", facebookCharLimit, promptText),
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
    };

    const generatedContent: { [key: string]: string } = {};
    console.log("[PULSAR_LOG] --- Raw AI Responses & Truncation ---");
    for (const network of Object.keys(results)) {
      const resultText = results[network].response.text();
      console.log(
        `[PULSAR_LOG] ${network.toUpperCase()} Raw Response:`,
        resultText,
      );
      // The new prompt structure should prevent hashtags from being truncated.
      // The truncate function is now a safeguard for the body only.
      generatedContent[network] = truncateText(resultText, charLimits[network]);
      console.log(
        `[PULSAR_LOG] ${network.toUpperCase()} Final Post:`,
        generatedContent[network],
      );
    }
    console.log("-------------------------------------");

    console.log("[PULSAR_LOG] Calling RPC to save post and charge pulse...");
    const { data: newPostId, error: rpcError } = await supabaseAdmin.rpc(
      "charge_pulse_and_save_post",
      {
        p_user_id: user.id,
        p_source_url: url,
        p_language: contentLanguage,
        p_content: generatedContent,
      },
    );

    if (rpcError) {
      console.error("[PULSAR_LOG] RPC error:", rpcError.message);
      // Check for the specific history limit error from the DB function
      if (rpcError.message.includes("HISTORY_LIMIT_REACHED")) {
        return new Response(
          JSON.stringify({
            status: "error",
            error:
              "Your post history is full (20 posts). Please delete old posts to generate new ones.",
            errorCode: "HISTORY_LIMIT_REACHED",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }
      throw new Error("Failed to save content and charge pulse.");
    }
    console.log(`[PULSAR_LOG] RPC success. New post ID: ${newPostId}`);

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Content generated successfully!",
        generatedContent: generatedContent,
        postId: newPostId,
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

    // Check for AI rate limiting error
    if (
      errorMessage.includes("429 Too Many Requests") ||
      errorMessage.includes("QuotaFailure") ||
      errorMessage.includes("503")
    ) {
      // Try to extract the retry delay from the error message
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

    // Fallback for other errors
    return new Response(
      JSON.stringify({ status: "error", error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Always return 200 OK and communicate error in JSON body
      },
    );
  }
});
