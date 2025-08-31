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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("--- Twitter Auth Start ---");

    const twitterClientId = Deno.env.get('TWITTER_CLIENT_ID');
    if (!twitterClientId) {
      throw new Error("TWITTER_CLIENT_ID is not set in environment variables.");
    }
    console.log("TWITTER_CLIENT_ID loaded.");

    const body = await req.json();
    console.log("Request body:", body);
    const { userId } = body;

    if (!userId) {
      console.error("Error: User ID is missing from the request body.");
      throw new Error('User ID is required.');
    }
    console.log("User ID received:", userId);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const state = generateRandomString(16);
    const codeVerifier = generateRandomString(128);
    const codeChallenge = base64urlencode(await sha256(codeVerifier));
    console.log("PKCE data generated.");

    const { error: stateError } = await supabaseAdmin.from('oauth_state').insert({
      state,
      code_verifier: codeVerifier,
      user_id: userId,
    });

    if (stateError) {
      console.error('Error saving OAuth state:', stateError);
      throw new Error('Could not save OAuth state.');
    }
    console.log("OAuth state saved to database.");

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
    console.log("Authorization URL created:", authorizationUrl);

    return new Response(JSON.stringify({ authorizationUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error in twitter-auth-start:", error.message);
    return new Response(JSON.stringify({ error: `Could not retrieve authorization URL. Internal error: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
