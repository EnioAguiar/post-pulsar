import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

console.log("Pulsar v1 function initialized with Cheerio");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      throw new Error("URL is required");
    }
    console.log("Scraping URL with Cheerio:", url);

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
      content: cleanedText, // Return a substantial snippet for the next step
    };

    console.log("Extracted Data:", { 
      title: extractedData.title, 
      description: extractedData.description, 
      contentLength: extractedData.content.length 
    });

    return new Response(JSON.stringify({ data: extractedData }), {
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