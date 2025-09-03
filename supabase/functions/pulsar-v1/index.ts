import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Pulsar v1 function initialized.");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { 
      url, 
      contentLanguage = 'English', 
      hashtagLanguage = 'English',
      linkedInCharCount,
      twitterCharCount,
      instagramCharCount,
      threadsCharCount
    } = await req.json();

    if (!url) {
      throw new Error("URL is required");
    }

    // 1. Authenticate user and CHECK pulses
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

    if (profile.monthly_pulses_remaining <= 0) {
      throw new Error("Você não tem pulsos suficientes para gerar novos conteúdos.");
    }

    // 2. Scraping
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
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // Base prompts
    let linkedInPrompt = `
      Você é um especialista em marketing de conteúdo e copywriting para o LinkedIn.
      Sua tarefa é transformar o artigo abaixo em um post engajante e profissional.
      **Instruções:**
      1.  **IDIOMA DO CONTEÚDO:** Gere o corpo do post no idioma: **${contentLanguage}**.
      2.  **IDIOMA DAS HASHTAGS:** Gere as hashtags no idioma: **${hashtagLanguage}**.
      3.  **Gancho (Hook):** Comece com uma primeira frase forte.
      4.  **Corpo do Post:** Desenvolva o tópico em 2 a 4 parágrafos curtos.
      5.  **Call-to-Action (CTA):** Termine com uma pergunta para incentivar comentários.
      6.  **Hashtags:** Inclua de 3 a 5 hashtags relevantes.
      **REGRA CRÍTICA: Sua resposta deve conter APENAS o texto do post gerado. Não inclua nenhuma introdução ou texto extra.**
    `;

    let twitterPrompt = `
      Você é um especialista em copywriting para o Twitter/X.
      Sua tarefa é transformar o artigo abaixo em um post curto e impactante.
      **Instruções:**
      1.  **IDIOMA DO CONTEÚDO:** Gere o corpo do post no idioma: **${contentLanguage}**.
      2.  **IDIOMA DAS HASHTAGS:** Gere as hashtags no idioma: **${hashtagLanguage}**.
      3.  **LIMITE:** O post DEVE ter no máximo 280 caracteres.
      4.  **Gancho (Hook):** Comece com uma frase que gere curiosidade.
      5.  **Tom de Voz:** Seja direto e informativo.
      6.  **Hashtags:** Inclua 2 a 3 hashtags relevantes.
      **REGRA CRÍTICA: Sua resposta deve conter APENAS o texto do post gerado. Não inclua nenhuma introdução ou texto extra.**
    `;

    let instagramPrompt = `
      Você é um especialista em mídias sociais, criando uma legenda para o Instagram.
      Sua tarefa é transformar o artigo abaixo em uma legenda que gere engajamento.
      **Instruções:**
      1.  **IDIOMA DO CONTEÚDO:** Gere a legenda no idioma: **${contentLanguage}**.
      2.  **IDIOMA DAS HASHTAGS:** Gere as hashtags no idioma: **${hashtagLanguage}**.
      3.  **Foco Visual:** A legenda deve complementar uma imagem sobre o tema do artigo. Comece com uma frase que chame a atenção.
      4.  **Estrutura:** Use parágrafos curtos e quebras de linha para facilitar a leitura.
      5.  **Call-to-Action (CTA):** Faça uma pergunta relacionada ao post para incentivar comentários.
      6.  **Hashtags:** Inclua entre 5 a 10 hashtags relevantes e populares.
      **REGRA CRÍTICA: Sua resposta deve conter APENAS o texto da legenda gerada. Não inclua nenhuma introdução ou texto extra.**
    `;

    let threadsPrompt = `
      Você é um especialista em mídias sociais, criando um post para o Threads.
      Sua tarefa é transformar o artigo abaixo em um post conversacional e informativo.
      **Instruções:**
      1.  **IDIOMA DO CONTEÚDO:** Gere o post no idioma: **${contentLanguage}**.
      2.  **IDIOMA DAS HASHTAGS:** Gere as hashtags no idioma: **${hashtagLanguage}**.
      3.  **Tom de Voz:** Conversacional, informativo e um pouco mais casual que o LinkedIn.
      4.  **Estrutura:** Use parágrafos curtos. Quebras de linha são bem-vindas.
      5.  **Call-to-Action (CTA):** Faça uma pergunta aberta para iniciar uma discussão.
      6.  **Hashtags:** Inclua 1 a 3 hashtags.
      **REGRA CRÍTICA: Sua resposta deve conter APENAS o texto do post gerado. Não inclua nenhuma introdução ou texto extra.**
    `;

    // Add character count instructions if provided
    if (linkedInCharCount > 0) {
      linkedInPrompt += `
      7. **TAMANHO:** Tente gerar um post com aproximadamente **${linkedInCharCount}** caracteres.`;
    }
    if (twitterCharCount > 0) {
      twitterPrompt += `
      7. **TAMANHO:** Tente gerar um post com aproximadamente **${twitterCharCount}** caracteres, mas NUNCA ultrapasse 280.`;
    }
    if (instagramCharCount > 0) {
      instagramPrompt += `
      7. **TAMANHO:** Tente gerar uma legenda com aproximadamente **${instagramCharCount}** caracteres.`;
    }
    if (threadsCharCount > 0) {
      threadsPrompt += `
      7. **TAMANHO:** Tente gerar um post com aproximadamente **${threadsCharCount}** caracteres.`;
    }

    // Add the article content to the prompts
    const articleSection = `
      **Artigo Original:**
      ---
      Título: ${title}
      Conteúdo:
      ${cleanedText}
      ---
      Gere o post, seguindo todas as regras.
    `;
    linkedInPrompt += articleSection;
    twitterPrompt += articleSection;
    instagramPrompt += articleSection;
    threadsPrompt += articleSection;

    // Generate all posts in parallel
    const [linkedInResult, twitterResult, instagramResult, threadsResult] = await Promise.all([
      model.generateContent(linkedInPrompt),
      model.generateContent(twitterPrompt),
      model.generateContent(instagramPrompt),
      model.generateContent(threadsPrompt)
    ]);

    const linkedInPost = linkedInResult.response.text();
    const twitterPost = twitterResult.response.text();
    const instagramPost = instagramResult.response.text();
    const threadsPost = threadsResult.response.text();

    // 4. Charge pulse and save to DB via RPC
    const { data: newPostId, error: rpcError } = await supabaseAdmin.rpc(
      'charge_pulse_and_save_post',
      {
        p_user_id: user.id,
        p_source_url: url,
        p_language: contentLanguage,
        p_content: { 
          linkedIn: linkedInPost, 
          twitter: twitterPost, 
          instagram: instagramPost,
          threads: threadsPost
        },
      }
    );

    if (rpcError) {
      console.error("RPC error:", rpcError);
      throw new Error("Failed to save content and charge pulse.");
    }

    // 5. Return response to frontend
    return new Response(JSON.stringify({
      message: "Content generated successfully!",
      generatedContent: {
        linkedIn: linkedInPost,
        twitter: twitterPost,
        instagram: instagramPost,
        threads: threadsPost
      },
      postId: newPostId,
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
