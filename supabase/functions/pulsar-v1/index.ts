import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";

console.log("Pulsar v1 function initialized with Cheerio");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url, language = 'English' } = await req.json(); // Default to English
    if (!url) {
      throw new Error("URL is required");
    }
    console.log(`Scraping URL: ${url}, Language: ${language}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
    const html = await response.text();

    // Load HTML into Cheerio
    const $ = cheerio.load(html);

    // Extract metadata manually
    const title = $("title").first().text() || $("h1").first().text();
    const description = $("meta[name='description']").attr("content") || $("p").first().text();

    // Simple text extraction from common article tags
    let body = "";
    $("article, main, .post-content, .blog-post, section").each((i, el) => {
      const elementText = $(el).text().trim();
      if (elementText.length > body.length) {
        body = elementText;
      }
    });

    // Fallback to the whole body if no specific container is found
    if (!body) {
      body = $("body").text().trim();
    }

    // Clean up whitespace and newlines
    const cleanedText = body.replace(/\s\s+/g, " ").trim();

    const extractedData = {
      source: url,
      title,
      description,
      content: cleanedText,
    };

    console.log("Extracted Data:", {
      title: extractedData.title,
      description: extractedData.description,
      contentLength: extractedData.content.length,
    });

    // --- Início da Integração com Gemini ---
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Você é um especialista em marketing de conteúdo e copywriting para redes sociais.
      Sua tarefa é transformar o artigo de blog abaixo em um post para o LinkedIn que seja engajante e profissional.

      **Instruções:**
      1.  **IDIOMA:** Gere o post final no seguinte idioma: **${language}**.
      2.  **Gancho (Hook):** Comece com uma primeira frase forte e cativante que prenda a atenção do leitor e o incentive a clicar em "ver mais". Pode ser uma pergunta, uma estatística surpreendente ou uma declaração ousada.
      3.  **Corpo do Post:** Desenvolva o tópico principal do artigo em 2 a 4 parágrafos curtos e fáceis de ler. Use quebras de linha para arejar o texto.
      4.  **Tom de Voz:** Mantenha um tom profissional, mas acessível e humano.
      5.  **Call-to-Action (CTA):** Termine com uma pergunta para incentivar comentários e discussão.
      6.  **Hashtags:** Inclua de 3 a 5 hashtags relevantes e específicas no final, no idioma do post.
      7.  **Emojis:** Use 1-3 emojis de forma sutil para adicionar um toque de personalidade e melhorar a legibilidade.

      **Artigo Original:**
      ---
      Título: ${extractedData.title}
      Conteúdo:
      ${extractedData.content}
      ---

      Agora, gere o post para o LinkedIn no idioma ${language}.
    `;

    const result = await model.generateContent(prompt);
    const responseFromAI = await result.response;
    const linkedInPost = responseFromAI.text();
    // --- Fim da Integração com Gemini ---

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