import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

const FACEBOOK_CLIENT_ID = Deno.env.get("FACEBOOK_CLIENT_ID")!;
const FACEBOOK_CLIENT_SECRET = Deno.env.get("FACEBOOK_CLIENT_SECRET")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) throw new Error("Authorization code not found.");
    if (!state) throw new Error("State parameter not found.");

    // 1. Validate state to get user_id
    const { data: stateData, error: stateError } = await supabaseAdmin
      .from("oauth_state")
      .select("user_id")
      .eq("state", state)
      .single();

    if (stateError || !stateData) {
      throw new Error("Invalid or expired state. Please try again.");
    }
    const userId = stateData.user_id;

    // Clean up the state now that we have the user ID
    await supabaseAdmin.from('oauth_state').delete().eq('state', state);

    // 2. Exchange code for a short-lived user access token
    const redirectUri = `https://wvfooigeytvdcfnzzrrg.supabase.co/functions/v1/facebook-auth-callback`;
    let tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?`;
    tokenUrl += `client_id=${FACEBOOK_CLIENT_ID}`;
    tokenUrl += `&redirect_uri=${encodeURIComponent(redirectUri)}`;
    tokenUrl += `&client_secret=${FACEBOOK_CLIENT_SECRET}`;
    tokenUrl += `&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData.error.message);
    const userAccessToken = tokenData.access_token;

    // 3. Exchange for a long-lived user access token
    let longLivedUrl = `https://graph.facebook.com/v18.0/oauth/access_token?`;
    longLivedUrl += `grant_type=fb_exchange_token`;
    longLivedUrl += `&client_id=${FACEBOOK_CLIENT_ID}`;
    longLivedUrl += `&client_secret=${FACEBOOK_CLIENT_SECRET}`;
    longLivedUrl += `&fb_exchange_token=${userAccessToken}`;

    const longLivedRes = await fetch(longLivedUrl);
    const longLivedData = await longLivedRes.json();
    if (!longLivedRes.ok) throw new Error(longLivedData.error.message);
    const longLivedUserToken = longLivedData.access_token;

    // 4. Get user's pages
    const pagesUrl = `https://graph.facebook.com/me/accounts?access_token=${longLivedUserToken}`;
    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();
    if (!pagesRes.ok) throw new Error(pagesData.error.message);

    if (!pagesData.data || pagesData.data.length === 0) {
      throw new Error("No Facebook Pages found for this user.");
    }

    // 5. Take the first page and get its details
    const firstPage = pagesData.data[0];
    const { id: pageId, name: pageName, access_token: pageAccessToken } = firstPage;

    // 6. Save the connection to the database
    const { error: insertError } = await supabaseAdmin
      .from("social_connections")
      .insert({
        user_id: userId,
        provider: "facebook",
        provider_user_id: pageId,
        provider_user_name: pageName,
        access_token: pageAccessToken, // Page Access Token is often long-lived by default
        refresh_token: null, // Page tokens might not have refresh tokens in the same way
      });

    if (insertError) {
      console.error("Error saving social connection:", insertError);
      throw new Error("Failed to save Facebook connection.");
    }

    // 7. Redirect user back to the app
    const appUrl = Deno.env.get("SITE_URL") || "http://localhost:4321";
    return Response.redirect(`${appUrl}/app/connections?status=success&network=facebook`);

  } catch (error) {
    console.error("Error in facebook-auth-callback:", error);
    const appUrl = Deno.env.get("SITE_URL") || "http://localhost:4321";
    return Response.redirect(`${appUrl}/app/connections?status=error&message=${encodeURIComponent(error.message)}`);
  }
});
