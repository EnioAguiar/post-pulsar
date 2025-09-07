import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'
import { corsHeaders } from '../_shared/cors.ts'

// Main function logic
async function handler(req: Request) {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the logged-in user.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the user from the auth context.
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: No user found' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Use the service_role key to query user profiles.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch user's plan from the profiles table.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('plan_type')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    // Security Check: Only allow 'pro' plan users to convert videos.
    if (profile.plan_type !== 'pro') {
      return new Response(JSON.stringify({ error: 'Forbidden: Video conversion is a Pro feature.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get parameters from the request body.
    const { videoUrl, outputFileName } = await req.json();
    if (!videoUrl || !outputFileName) {
      return new Response(JSON.stringify({ error: 'Missing videoUrl or outputFileName' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch the converter service URL and API key from environment variables.
    const converterUrl = Deno.env.get('CONVERTER_SERVICE_URL');
    const serviceApiKey = Deno.env.get('SERVICE_API_KEY');

    if (!converterUrl || !serviceApiKey) {
        throw new Error('Converter service URL or API key is not configured in environment variables.');
    }

    // Call the external video converter microservice.
    const response = await fetch(`${converterUrl}/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceApiKey}`,
      },
      body: JSON.stringify({ videoUrl, outputFileName }),
    });

    // Check if the call to the microservice was successful.
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Converter service failed with status ${response.status}: ${errorBody}`);
    }

    const responseData = await response.json();

    // Return the response from the microservice to the client.
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}

serve(handler)
