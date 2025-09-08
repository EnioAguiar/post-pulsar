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
    console.log("DEBUG: Calling external converter service at:", converterUrl);

    const response = await fetch(`${converterUrl}/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceApiKey}`,
      },
      body: JSON.stringify({ videoUrl, outputFileName }),
    });

    console.log(`DEBUG: Converter service responded with status: ${response.status}`);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error("ERROR: Converter service failed:", errorBody);
      throw new Error(`Converter service failed with status ${response.status}: ${errorBody}`);
    }

    const responseData = await response.json();
    console.log("SUCCESS: Video conversion successful. Returning response to client.");

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("FATAL: Unhandled exception in function:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}

serve(handler)