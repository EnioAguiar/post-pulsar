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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const createPrompt = (network: string, charCount: number) => {
      const networkProfiles: Record<string, { name: string; tone: string; hashtags: string }> = {
        linkedin: {
          name: "LinkedIn",
          tone: "Profissional e engajante. Comece com uma frase forte, desenvolva em 2-4 parágrafos curtos e termine com uma pergunta.",
          hashtags: "3 a 5 hashtags relevantes.",
        },
        twitter: {
          name: "Twitter/X",
          tone: "Direto, curto e impactante. Comece com uma frase que gere curiosidade.",
          hashtags: "2 a 3 hashtags relevantes.",
        },
        instagram: {
          name: "Instagram",
          tone: "Visual e apelativo. A legenda deve complementar uma imagem. Use parágrafos curtos e quebras de linha.",
          hashtags: "5 a 10 hashtags relevantes e populares.",
        },
        threads: {
          name: "Threads",
          tone: "Conversacional e informativo, mais casual que o LinkedIn. Use parágrafos curtos e faça uma pergunta aberta.",
          hashtags: "1 a 3 hashtags.",
        },
      };

      const profile = networkProfiles[network];
      const lowerBound = Math.max(charCount - 50, 1); // Garante que o limite inferior não seja negativo

      let prompt = `
        Você é um copywriter especialista em redes sociais. Sua tarefa é adaptar o artigo fornecido para um post de ${profile.name}.

        **REGRAS IMPORTANTES:**
        1.  **META DE CARACTERES:** O post deve ter **ENTRE ${lowerBound} E ${charCount} CARACTERES** (incluindo espaços). Tente ser conciso. Se o texto gerado for um pouco mais longo, ele será cortado automaticamente para caber no limite.
        2.  **IDIOMA DO CONTEÚDO:** O post deve ser gerado no idioma: **${contentLanguage}**.
        3.  **IDIOMA DAS HASHTAGS:** As hashtags devem ser geradas no idioma: **${hashtagLanguage}**.
        4.  **FORMATO DA RESPOSTA:** Sua resposta deve conter APENAS o texto do post gerado. Não inclua "Aqui está o post:" ou qualquer outra introdução.

        **DIRETRIZES DE CONTEÚDO:**
        -   **Tom de Voz:** ${profile.tone}
        -   **Hashtags:** Inclua ${profile.hashtags}

        **Artigo Original:**
        ---
        Título: ${title}
        Conteúdo:
        ${cleanedText}
        ---

        Gere o post para ${profile.name} seguindo TODAS as regras, especialmente a meta de caracteres.
      `;
      return prompt;
    };

    const truncateText = (text: string, limit: number): string => {
      if (text.length <= limit) {
        return text;
      }
    
      // Prioritize cutting at the last full sentence.
      const truncatedText = text.substring(0, limit);
      const lastPeriodIndex = truncatedText.lastIndexOf('.');
    
      if (lastPeriodIndex > 0) {
        return truncatedText.substring(0, lastPeriodIndex + 1);
      }
    
      // If no period, try cutting at the last word.
      const lastSpaceIndex = truncatedText.lastIndexOf(' ');

      if (lastSpaceIndex > 0) {
        const baseText = truncatedText.substring(0, lastSpaceIndex);
        // Ensure adding '...' doesn't exceed the limit.
        return (baseText.length + 3) <= limit 
          ? baseText + '...' 
          : baseText.substring(0, limit - 3) + '...';
      }
    
      // If no spaces, force cut.
      return text.substring(0, limit - 3) + '...';
    };

    const linkedInCharLimit = linkedInCharCount > 0 ? linkedInCharCount : 1000;
    const twitterCharLimit = twitterCharCount > 0 ? twitterCharCount : 280;
    const instagramCharLimit = instagramCharCount > 0 ? instagramCharCount : 500;
    const threadsCharLimit = threadsCharCount > 0 ? threadsCharCount : 500;

    const linkedInPrompt = createPrompt("linkedin", linkedInCharLimit);
    const twitterPrompt = createPrompt("twitter", twitterCharLimit);
    const instagramPrompt = createPrompt("instagram", instagramCharLimit);
    const threadsPrompt = createPrompt("threads", threadsCharLimit);

    // Generate all posts in parallel
    const [linkedInResult, twitterResult, instagramResult, threadsResult] = await Promise.all([
      model.generateContent(linkedInPrompt),
      model.generateContent(twitterPrompt),
      model.generateContent(instagramPrompt),
      model.generateContent(threadsPrompt)
    ]);

    const linkedInPost = truncateText(linkedInResult.response.text(), linkedInCharLimit);
    const twitterPost = truncateText(twitterResult.response.text(), twitterCharLimit);
    const instagramPost = truncateText(instagramResult.response.text(), instagramCharLimit);
    const threadsPost = truncateText(threadsResult.response.text(), threadsCharLimit);

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
