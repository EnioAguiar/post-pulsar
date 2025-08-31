import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      throw new Error('Authorization code or state missing.');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Retrieve the original request details from the database
    const { data: stateData, error: stateError } = await supabaseAdmin
      .from('oauth_state')
      .select('code_verifier, user_id')
      .eq('state', state)
      .single();

    if (stateError || !stateData) {
      throw new Error('Invalid state parameter. Possible CSRF attack.');
    }

    const { code_verifier, user_id } = stateData;

    // 2. Exchange the authorization code for an access token
    const twitterClientId = Deno.env.get('TWITTER_CLIENT_ID');
    const twitterClientSecret = Deno.env.get('TWITTER_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/twitter-auth-callback`;

    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${twitterClientId}:${twitterClientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        code_verifier: code_verifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      throw new Error(`Twitter token exchange failed: ${errorBody}`);
    }

    const tokens = await tokenResponse.json();

    // 3. Get the Twitter User ID
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch Twitter user info.');
    }

    const twitterUser = await userResponse.json();
    const providerUserId = twitterUser.data.id;

    // 4. Save the connection details to the database
    const { error: insertError } = await supabaseAdmin.from('social_connections').insert({
      user_id: user_id,
      provider: 'twitter',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scopes: tokens.scope.split(' '),
      expires_at: new Date(Date.now() + tokens.expires_in * 1000),
      provider_user_id: providerUserId,
    });

    if (insertError) {
      throw new Error(`Failed to save social connection: ${insertError.message}`);
    }

    // 5. Clean up the state table
    await supabaseAdmin.from('oauth_state').delete().eq('state', state);

    // 6. Redirect user back to the connections page
    const appUrl = Deno.env.get('SITE_URL');
    if (!appUrl) {
      throw new Error('SITE_URL is not set in Supabase secrets.');
    }
    const redirectUrl = new URL('/app/connections', appUrl);
    return Response.redirect(redirectUrl.href, 303);

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
