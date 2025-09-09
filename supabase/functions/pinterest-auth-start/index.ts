import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { decode } from 'https://deno.land/x/djwt@v2.2/mod.ts';

const PINTEREST_CLIENT_ID = Deno.env.get('PINTEREST_CLIENT_ID');
const REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')}/functions/v1/pinterest-auth-callback`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get user ID from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    const jwt = authHeader.replace('Bearer ', '');
    const [, payload] = decode(jwt);
    const userId = payload?.sub;
    if (!userId) {
      throw new Error('Could not extract user ID from JWT');
    }

    // Create a state token to prevent CSRF attacks
    const { data: stateData, error: stateError } = await supabaseAdmin
      .from('oauth_state')
      .insert({ user_id: userId })
      .select('state')
      .single();

    if (stateError) throw stateError;
    const state = stateData.state;

    // Construct the authorization URL
    const scopes = 'boards:read,pins:write,user_accounts:read';
    const params = new URLSearchParams({
      client_id: PINTEREST_CLIENT_ID!,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: scopes,
      state: state,
    });

    const authorizationUrl = `https://www.pinterest.com/oauth/?${params.toString()}`;

    return new Response(JSON.stringify({ authorizationUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in pinterest-auth-start:', error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});