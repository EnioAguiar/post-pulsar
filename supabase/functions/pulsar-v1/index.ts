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
    const { url, contentLanguage = 'English', hashtagLanguage = 'English' } = await req.json();
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
    console.log(`Scraping URL: ${url}`);
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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const linkedInPrompt = `
      Você é um especialista em marketing de conteúdo e copywriting para redes sociais.
      Sua tarefa é transformar o artigo de blog abaixo em um post para o LinkedIn que seja engajante e profissional.
      **Instruções:**
      1.  **IDIOMA DO CONTEÚDO:** Gere o corpo do post (gancho, corpo, CTA) no seguinte idioma: **${contentLanguage}**.
      2.  **IDIOMA DAS HASHTAGS:** Gere as hashtags no seguinte idioma: **${hashtagLanguage}**.
      3.  **Gancho (Hook):** Comece com uma primeira frase forte e cativante.
      4.  **Corpo do Post:** Desenvolva o tópico em 2 a 4 parágrafos curtos.
      5.  **Tom de Voz:** Mantenha um tom profissional, mas acessível.
      6.  **Call-to-Action (CTA):** Termine com uma pergunta para incentivar comentários.
      7.  **Hashtags:** Inclua de 3 a 5 hashtags relevantes.
      8.  **Emojis:** Use de 1 a 3 emojis de forma sutil.
      
      **REGRA CRÍTICA: Sua resposta deve conter APENAS o texto do post gerado. Não inclua nenhuma introdução, explicação, ou qualquer texto que não seja o post em si.**

      **Artigo Original:**
      ---
      Título: ${title}
      Conteúdo:
      ${cleanedText}
      ---
      Gere o post para o LinkedIn, seguindo todas as regras.
    `;

    const twitterPrompt = `
      Você é um especialista em marketing de conteúdo e copywriting para redes sociais, focado no Twitter/X.
      Sua tarefa é transformar o artigo de blog abaixo em um post curto e impactante para o Twitter/X.
      **Instruções:**
      1.  **IDIOMA DO CONTEÚDO:** Gere o corpo do post (gancho, corpo) no seguinte idioma: **${contentLanguage}**.
      2.  **IDIOMA DAS HASHTAGS:** Gere as hashtags no seguinte idioma: **${hashtagLanguage}**.
      3.  **LIMITE:** O post DEVE ter no máximo 280 caracteres.
      4.  **Gancho (Hook):** Comece com uma frase que gere curiosidade.
      5.  **Corpo do Post:** Vá direto ao ponto. Use frases curtas e claras.
      6.  **Tom de Voz:** Seja direto, informativo e um pouco provocador.
      7.  **Hashtags:** Inclua 2 a 3 hashtags relevantes.
      8.  **Emojis:** Use 1 ou 2 emojis para adicionar personalidade.

      **REGRA CRÍTICA: Sua resposta deve conter APENAS o texto do post gerado. Não inclua nenhuma introdução, explicação, ou qualquer texto que não seja o post em si.**

      **Artigo Original:**
      ---
      Título: ${title}
      Conteúdo:
      ${cleanedText}
      ---
      Gere o post para o Twitter/X, seguindo todas as regras.
    `;

    // Generate both posts in parallel
    const [linkedInResult, twitterResult] = await Promise.all([
      model.generateContent(linkedInPrompt),
      model.generateContent(twitterPrompt)
    ]);

    const linkedInPost = linkedInResult.response.text();
    const twitterPost = twitterResult.response.text();


    // 4. Charge pulse and save to DB via RPC
    console.log("Attempting to charge pulse and save post via RPC...");
    const { data: newPostId, error: rpcError } = await supabaseAdmin.rpc(
      'charge_pulse_and_save_post',
      {
        p_user_id: user.id,
        p_source_url: url,
        p_language: contentLanguage, // Storing the main content language
        p_content: { linkedIn: linkedInPost, twitter: twitterPost }, // Sending a JSON object
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
      generatedContent: {
        linkedIn: linkedInPost,
        twitter: twitterPost,
      },
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