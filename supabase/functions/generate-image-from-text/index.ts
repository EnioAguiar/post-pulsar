import { serve } from "std/http/server.ts";
import { createClient } from "supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { rawText, templateId = "default", color } = await req.json();

    // Init Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          status: "error",
          error: "Missing Authorization header",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const token = authHeader.split(" ")[1];
    const { data: userData, error: authError } =
      await supabaseAdmin.auth.getUser(token);

    if (authError || !userData.user) {
      console.error("Authentication error:", authError?.message);
      return new Response(
        JSON.stringify({
          status: "error",
          error: "Unauthorized",
          details: authError?.message,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }
    const userId = userData.user.id;

    if (!rawText) {
      return new Response(
        JSON.stringify({
          status: "error",
          error: "Missing rawText in request body",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Initialize Google Generative AI
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not set.");
    }
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // AI Prompt for quote extraction
    const prompt = `Extract a concise, impactful, and shareable quote (max 20 words) from the following text. Do not add any introductory or concluding remarks, just the quote itself.
    
    Text: "${rawText}"
    
    Quote:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiExtractedQuote = response.text().trim();

    if (!aiExtractedQuote) {
      return new Response(
        JSON.stringify({
          status: "error",
          error:
            "Failed to extract a quote from the text. Please try again with different content.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Debit pulse
    const { error: pulseError } = await supabaseAdmin.rpc(
      "charge_for_image_generation",
      { p_user_id: userId },
    );
    if (pulseError) {
      console.error("Pulse debit error:", pulseError.message);
      return new Response(
        JSON.stringify({
          status: "error",
          error: "Failed to debit pulses for image generation.",
          details: pulseError.message,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    console.log(`Pulse debited for user ${userId}`);

    // Call video-converter-service to generate the image
    let converterServiceUrl = Deno.env.get("CONVERTER_SERVICE_URL");
    const serviceApiKey = Deno.env.get("SERVICE_API_KEY");

    if (!converterServiceUrl || !serviceApiKey) {
      throw new Error("CONVERTER_SERVICE_URL or SERVICE_API_KEY is not set.");
    }

    if (!converterServiceUrl.startsWith("http")) {
      converterServiceUrl = `https://${converterServiceUrl}`;
    }

    const generateImageResponse = await fetch(
      `${converterServiceUrl}/generate-image`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceApiKey}`,
        },
        body: JSON.stringify({
          text: aiExtractedQuote,
          templateId: templateId,
          color: color,
          userId: userId, // Pass userId for RLS in storage
        }),
      },
    );

    if (!generateImageResponse.ok) {
      const errorBody = await generateImageResponse.json();
      throw new Error(
        `Converter service failed: ${generateImageResponse.statusText} - ${errorBody.error || "Unknown error"}`,
      );
    }

    const { publicUrl } = await generateImageResponse.json();

    return new Response(
      JSON.stringify({ status: "success", publicUrl: publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in generate-image-from-text function:", error.message);
    return new Response(
      JSON.stringify({
        status: "error",
        error: error.message,
        details: error.stack,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
