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
    console.log(`Scraping URL: ${url}, Language: ${language}`);

    // 1. Scraping
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

    // 2. AI Content Generation
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

    // 3. Save to Database
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error("User not found.");
    }

    const { error: dbError } = await supabaseClient
      .from("generated_posts")
      .insert({
        user_id: user.id,
        source_url: url,
        language: language,
        content: linkedInPost,
      });

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to save generated content.");
    }

    console.log("Successfully saved generated post for user:", user.id);

    // 4. Return response to frontend
    return new Response(JSON.stringify({ data: linkedInPost }), {
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