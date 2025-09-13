import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'
import { corsHeaders } from '../_shared/cors.ts'

console.log("INFO: Initializing 'request-video-conversion' function");

async function handler(req: Request) {
  console.log(`INFO: [${new Date().toISOString()}] Received request: ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    console.log("DEBUG: Handling OPTIONS preflight request.");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- ADVANCED LOGGING & AUTHENTICATION ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("ERROR: Missing Authorization header.");
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log("DEBUG: Authorization header found:", authHeader.substring(0, 15) + "..."); // Log a snippet

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
        console.error("ERROR: Token not found in Authorization header.");
        return new Response(JSON.stringify({ error: 'Unauthorized: Malformed Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Decode the JWT manually to get the user ID (sub)
    // This is the standard workaround for the buggy .auth.getUser() in Deno
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;
    if (!userId) {
        console.error("ERROR: Could not extract user ID (sub) from JWT payload.");
        return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token payload' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log("SUCCESS: JWT decoded successfully. User ID:", userId);

    // --- CORE LOGIC ---
    console.log(`DEBUG: Checking plan for user ${userId}`);
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('plan_type')
      .eq('id', userId)
      .single();

    if (profileError) {
        console.error("ERROR: Supabase profile fetch error:", profileError);
        throw profileError;
    }
    console.log(`DEBUG: User ${userId} plan is '${profile.plan_type}'`);

    // Preventive fix: remove single quotes from plan_type ENUM, based on lesson #15
    if (profile.plan_type.replace(/'/g, "") !== 'pro') {
      console.warn(`WARN: User ${userId} with plan '${profile.plan_type}' attempted to access Pro feature.`);
      return new Response(JSON.stringify({ error: 'Forbidden: Video conversion is a Pro feature.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log(`DEBUG: User ${userId} is authorized for video conversion.`);

    const { videoUrl, outputFileName } = await req.json();
    console.log("DEBUG: Request body parsed:", { videoUrl, outputFileName });
    if (!videoUrl || !outputFileName) {
      console.error("ERROR: Missing 'videoUrl' or 'outputFileName' in request body.");
      return new Response(JSON.stringify({ error: 'Missing videoUrl or outputFileName' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const converterUrl = Deno.env.get('CONVERTER_SERVICE_URL');
    const serviceApiKey = Deno.env.get('SERVICE_API_KEY');

    if (!converterUrl || !serviceApiKey) {
        console.error("FATAL: Converter service environment variables not set.");
        throw new Error('Converter service URL or API key is not configured in environment variables.');
    }
    
    // --- 1. Analyze Video ---
    console.log("DEBUG: Calling /analyze endpoint on converter service.");
    const analyzeResponse = await fetch(`${converterUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceApiKey}`,
      },
      body: JSON.stringify({ videoUrl }),
    });

    if (!analyzeResponse.ok) {
        const errorBody = await analyzeResponse.text();
        console.error("ERROR: Analysis service failed:", errorBody);
        // Fallback to conversion if analysis fails
        console.warn("WARN: Analysis failed. Falling back to forced conversion.");
    } else {
        const analysisData = await analyzeResponse.json();
        console.log("DEBUG: Analysis successful. Data:", JSON.stringify(analysisData).substring(0, 200) + "...");

        const videoStream = analysisData.streams.find(s => s.codec_type === 'video');
        const format = analysisData.format;

        // --- 2. Check Compliance ---
        const isCompliant = 
            format.format_name?.includes('mp4') &&
            videoStream?.codec_name === 'h264' &&
            videoStream?.width <= 1080 &&
            videoStream?.height <= 1920 &&
            parseFloat(format.size) < (50 * 1024 * 1024); // 50MB

        if (isCompliant) {
            console.log("INFO: Video is compliant. Calling /clean to remux and prevent metadata issues.");
            const cleanResponse = await fetch(`${converterUrl}/clean`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceApiKey}`,
              },
              body: JSON.stringify({ videoUrl, outputFileName }),
            });

            if (!cleanResponse.ok) {
                const errorBody = await cleanResponse.text();
                console.error("ERROR: Clean service failed:", errorBody);
                throw new Error(`Clean service failed with status ${cleanResponse.status}: ${errorBody}`);
            }
            
            const cleanData = await cleanResponse.json();
            console.log("SUCCESS: Video cleaned successfully. Returning response to client.");
            return new Response(JSON.stringify(cleanData), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
        }
        console.log("INFO: Video is not compliant. Proceeding with conversion.");
    }

    // --- 3. Convert Video (if not compliant or analysis failed) ---
    console.log("DEBUG: Calling /convert endpoint on converter service.");
    const convertResponse = await fetch(`${converterUrl}/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceApiKey}`,
      },
      body: JSON.stringify({ videoUrl, outputFileName }),
    });

    console.log(`DEBUG: Converter service (/convert) responded with status: ${convertResponse.status}`);
    if (!convertResponse.ok) {
      const errorBody = await convertResponse.text();
      console.error("ERROR: Converter service (/convert) failed:", errorBody);
      throw new Error(`Converter service failed with status ${convertResponse.status}: ${errorBody}`);
    }

    const responseData = await convertResponse.json();
    console.log("SUCCESS: Video conversion successful. Returning response to client.");

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const stack = error instanceof Error ? error.stack : "No stack available";
    console.error("FATAL: Unhandled exception in function:", errorMessage, stack);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}

serve(handler)