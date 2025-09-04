import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import * as oauth from 'https://raw.githubusercontent.com/snsinfu/deno-oauth-1.0a/main/extra/mod.ts';

// Helper function to generate a random string for the state
const generateRandomString = (length: number) => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    if (!userId) {
      throw new Error('User ID is required.');
    }

    const consumerKey = Deno.env.get('TWITTER_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('TWITTER_CONSUMER_SECRET');

    if (!consumerKey || !consumerSecret) {
      throw new Error('Twitter Consumer Key or Secret is not set.');
    }

    const api = new oauth.Api({
      consumer: { key: consumerKey, secret: consumerSecret },
      signature: oauth.HMAC_SHA1,
      prefix: 'https://api.twitter.com',
    });

    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/twitter-auth-callback`;
    
    const response = await api.request('POST', '/oauth/request_token', {
      data: { oauth_callback: callbackUrl },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Twitter request token failed with status ${response.status}: ${errorBody}`);
    }

    const responseText = await response.text();
    const requestTokenData = new URLSearchParams(responseText);
    
    const requestToken = {
        key: requestTokenData.get('oauth_token'),
        secret: requestTokenData.get('oauth_token_secret'),
    };

    if (!requestToken.key || !requestToken.secret) {
        throw new Error('oauth_token or oauth_token_secret not found in Twitter response');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const state = generateRandomString(16);

    const { error: stateError } = await supabaseAdmin.from('oauth_state').insert({
      state: state,
      user_id: userId,
      oauth_token: requestToken.key,
      oauth_token_secret: requestToken.secret,
    });

    if (stateError) {
      console.error('[twitter-auth-start] Error saving state to Supabase:', stateError);
      throw new Error(`Could not save OAuth state: ${stateError.message}`);
    }

        const authorizationUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${requestToken.key}`;

    return new Response(JSON.stringify({ authorizationUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[twitter-auth-start] An error occurred:', error);
    return new Response(JSON.stringify({ error: `Could not retrieve authorization URL. Internal error: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});