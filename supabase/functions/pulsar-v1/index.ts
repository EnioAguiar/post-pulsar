import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Pulsar v1 function initialized with Cheerio and Supabase client.");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url, language = 'English' } = await req.json();
    if (!url) {
      throw new Error("URL is required");
    }

    // 1. Authenticate user and CHECK (don't decrement) pulses
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error("User not found.");
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set.");
      throw new Error("Server configuration error.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceKey
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("monthly_pulses_remaining")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile error:", profileError);
      throw new Error("Could not retrieve user profile.");
    }

    console.log(`User ${user.id} has ${profile.monthly_pulses_remaining} pulses remaining.`);

    // Check if user has enough pulses for the GENERATION action.
    if (profile.monthly_pulses_remaining <= 0) {
      throw new Error("Você não tem pulsos suficientes para gerar novos conteúdos.");
    }

    // 2. Scraping
    console.log(`Scraping URL: ${url}, Language: ${language}`);
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

    // 3. AI Content Generation
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      Você é um especialista em marketing de conteúdo e copywriting para redes sociais.
      Sua tarefa é transformar o artigo de blog abaixo em um post para o LinkedIn que seja engajante e profissional.
      **Instruções:**
      1.  **IDIOMA:** Gere o post final no seguinte idioma: **${language}**.
      2.  **Gancho (Hook):** Comece com uma primeira frase forte e cativante.
      3.  **Corpo do Post:** Desenvolva o tópico em 2 a 4 parágrafos curtos.
      4.  **Tom de Voz:** Mantenha um tom profissional, mas acessível.
      5.  **Call-to-Action (CTA):** Termine com uma pergunta para incentivar comentários.
      6.  **Hashtags:** Inclua de 3 a 5 hashtags relevantes no idioma do post.
      7.  **Emojis:** Use de 1 a 3 emojis de forma sutil.
      **Artigo Original:**
      ---
      Título: ${title}
      Conteúdo:
      ${cleanedText}
      ---
      Agora, gere o post para o LinkedIn no idioma ${language}.
    `;
    const result = await model.generateContent(prompt);
    const responseFromAI = await result.response;
    const linkedInPost = responseFromAI.text();

    // 4. Charge pulse and save to DB via RPC
    console.log("Attempting to charge pulse and save post via RPC...");
    const { data: newPostId, error: rpcError } = await supabaseAdmin.rpc(
      'charge_pulse_and_save_post',
      {
        p_user_id: user.id,
        p_source_url: url,
        p_language: language,
        p_content: linkedInPost,
      }
    );

    if (rpcError) {
      console.error("RPC error:", rpcError);
      throw new Error("Failed to save content and charge pulse.");
    }

    console.log("Successfully charged pulse and saved post with ID:", newPostId);

    // 5. Return response to frontend
    return new Response(JSON.stringify({
      message: "Content generated successfully!",
      generatedContent: linkedInPost,
      postId: newPostId, // Return the new post ID
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});