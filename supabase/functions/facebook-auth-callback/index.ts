import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

// --- Environment Variables ---
const FACEBOOK_CLIENT_ID = Deno.env.get("FACEBOOK_CLIENT_ID");
const FACEBOOK_CLIENT_SECRET = Deno.env.get("FACEBOOK_CLIENT_SECRET");
const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:4321";

// --- Type Definitions ---
interface IFacebookError {
  error: { message: string };
}
interface IFacebookTokenData {
  access_token: string;
}
interface IFacebookPage {
  id: string;
  name: string;
  access_token: string;
}
interface IFacebookPagesResponse {
  data: IFacebookPage[];
}

// --- Main Handler ---
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Check for essential environment variables
  if (!FACEBOOK_CLIENT_ID || !FACEBOOK_CLIENT_SECRET) {
    console.error("Critical: Facebook environment variables not set.");
    return Response.redirect(`${SITE_URL}/app/connections?status=error&message=${encodeURIComponent("Server configuration error.")}`);
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) throw new Error("Authorization code not found in callback.");
    if (!state) throw new Error("State parameter not found in callback.");

    // 1. Validate state to get user_id
    const { data: stateData, error: stateError } = await supabaseAdmin
      .from("oauth_state")
      .select("user_id")
      .eq("state", state)
      .single();
    if (stateError || !stateData) {
      throw new Error("Invalid or expired state. Please try the connection again.");
    }
    const userId = stateData.user_id;
    await supabaseAdmin.from('oauth_state').delete().eq('state', state);

    // 2. Exchange code for a user access token
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/facebook-auth-callback`;
    const tokenUrl = new URL(`https://graph.facebook.com/v18.0/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", FACEBOOK_CLIENT_ID);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("client_secret", FACEBOOK_CLIENT_SECRET);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl);
    const tokenData: IFacebookTokenData | IFacebookError = await tokenRes.json();
    if (!tokenRes.ok) throw new Error((tokenData as IFacebookError).error.message);
    const userAccessToken = (tokenData as IFacebookTokenData).access_token;
    
    // 3. Exchange for a long-lived user access token
    const longLivedUrl = new URL(`https://graph.facebook.com/v18.0/oauth/access_token`);
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", FACEBOOK_CLIENT_ID);
    longLivedUrl.searchParams.set("client_secret", FACEBOOK_CLIENT_SECRET);
    longLivedUrl.searchParams.set("fb_exchange_token", userAccessToken);

    const longLivedRes = await fetch(longLivedUrl);
    const longLivedData: IFacebookTokenData | IFacebookError = await longLivedRes.json();
    if (!longLivedRes.ok) throw new Error((longLivedData as IFacebookError).error.message);
    const longLivedUserToken = (longLivedData as IFacebookTokenData).access_token;

    // 4. Get user's pages
    const pagesUrl = `https://graph.facebook.com/me/accounts?access_token=${longLivedUserToken}`;
    const pagesRes = await fetch(pagesUrl);
    const pagesData: IFacebookPagesResponse | IFacebookError = await pagesRes.json();
    if (!pagesRes.ok) throw new Error((pagesData as IFacebookError).error.message);

    const pages = (pagesData as IFacebookPagesResponse).data;
    if (!pages || pages.length === 0) {
      throw new Error("No Facebook Pages found for this account.");
    }

    // 5. Clean up old connections and insert new ones
    await supabaseAdmin.from('social_connections').delete().match({ user_id: userId, provider: 'facebook' });

    const pagesToInsert = pages.map((page: IFacebookPage) => ({
      user_id: userId,
      provider: 'facebook',
      provider_user_id: page.id,
      provider_user_name: page.name,
      access_token: page.access_token,
      refresh_token: null, // Page tokens might not have refresh tokens
    }));

    const { error: insertError } = await supabaseAdmin.from('social_connections').insert(pagesToInsert);
    if (insertError) {
      console.error('Error saving new social connections:', insertError);
      throw new Error('Failed to save new Facebook page connections.');
    }

    // 6. Redirect user back to the app on success
    return Response.redirect(`${SITE_URL}/app/connections?status=success&network=facebook`);
  } catch (err) {
    const error = err as Error;
    console.error("Error in facebook-auth-callback:", error.message);
    return Response.redirect(`${SITE_URL}/app/connections?status=error&message=${encodeURIComponent(error.message)}`);
  }
});