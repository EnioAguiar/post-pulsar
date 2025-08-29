import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { corsHeaders } from '../_shared/cors.ts';

// Helper function to generate a random string for the state and code_verifier
const generateRandomString = (length: number) => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// Helper function to generate the SHA-256 hash for the code_challenge
async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest('SHA-256', data);
}

// Helper function to Base64 URL encode the hash
function base64urlencode(a: ArrayBuffer): string {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(a)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

serve(async (req) => {
  // DEBUG: Log all environment variables the function can see.
  console.log("--- DEBUG: Environment Variables ---", Deno.env.toObject());

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    if (!userId) {
      throw new Error('User ID is required.');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const state = generateRandomString(16);
    const codeVerifier = generateRandomString(128);
    const codeChallenge = base64urlencode(await sha256(codeVerifier));

    // Store the state and code_verifier in the database for later retrieval
    const { error: stateError } = await supabaseAdmin.from('oauth_state').insert({
      state,
      code_verifier: codeVerifier,
      user_id: userId,
    });

    if (stateError) {
      console.error('Error saving OAuth state:', stateError);
      throw new Error('Could not save OAuth state.');
    }

    const twitterClientId = Deno.env.get('TWITTER_CLIENT_ID');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/twitter-auth-callback`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: twitterClientId,
      redirect_uri: redirectUri,
      scope: 'tweet.read tweet.write users.read offline.access',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const authorizationUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;

    return new Response(JSON.stringify({ authorizationUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
