import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import * as oauth from "https://raw.githubusercontent.com/snsinfu/deno-oauth-1.0a/main/mod.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[twitter-auth-callback] Received request.");
    const url = new URL(req.url);
    console.log(`[twitter-auth-callback] Request URL: ${req.url}`);
    const requestTokenKey = url.searchParams.get("oauth_token");
    const verifier = url.searchParams.get("oauth_verifier");

    if (!requestTokenKey || !verifier) {
      throw new Error("OAuth token or verifier missing from callback.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: stateData, error: stateError } = await supabaseAdmin
      .from("oauth_state")
      .select("user_id, oauth_token_secret")
      .eq("oauth_token", requestTokenKey)
      .single();

    if (stateError || !stateData) {
      console.error(
        "[twitter-auth-callback] Error fetching state:",
        stateError,
      );
      throw new Error("Invalid or expired token. Please try connecting again.");
    }

    const { user_id, oauth_token_secret: requestTokenSecret } = stateData;
    console.log(
      `[twitter-auth-callback] Retrieved user_id: ${user_id} from state.`,
    );

    const consumerKey = Deno.env.get("TWITTER_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("TWITTER_CONSUMER_SECRET");

    if (!consumerKey || !consumerSecret) {
      throw new Error("Twitter Consumer Key or Secret is not set.");
    }

    const client = new oauth.OAuthClient({
      consumer: { key: consumerKey, secret: consumerSecret },
      signature: oauth.HMAC_SHA1,
    });

    const requestUrl = "https://api.twitter.com/oauth/access_token";

    const signed = client.sign("POST", requestUrl, {
      token: { key: requestTokenKey, secret: requestTokenSecret },
      params: { oauth_verifier: verifier },
    });

    const authHeader = oauth.toAuthHeader(signed);

    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Twitter access token exchange failed with status ${response.status}: ${errorBody}`,
      );
    }

    const responseText = await response.text();
    const finalTokens = new URLSearchParams(responseText);

    const accessToken = finalTokens.get("oauth_token");
    const accessTokenSecret = finalTokens.get("oauth_token_secret");
    const providerUserId = finalTokens.get("user_id");
    const providerUserName = finalTokens.get("screen_name");

    console.log("[twitter-auth-callback] Extracted final tokens:", {
      providerUserId,
      providerUserName,
    });

    if (!accessToken || !accessTokenSecret || !providerUserId) {
      throw new Error("Failed to get final access tokens from Twitter.");
    }

    const connectionData = {
      user_id: user_id,
      provider: "twitter",
      provider_user_id: providerUserId,
      provider_user_name: providerUserName,
      oauth_token: accessToken,
      oauth_token_secret: accessTokenSecret,
      access_token: "", // Set to empty string to satisfy NOT NULL constraint
      refresh_token: "", // Set to empty string to satisfy NOT NULL constraint
      scopes: ["oauth1.0a"],
      expires_at: null,
      purpose: "publishing", // Added to match the new UNIQUE constraint
    };

    console.log(
      "[twitter-auth-callback] Attempting to upsert connection data:",
      JSON.stringify(connectionData, null, 2),
    );

    const { error: upsertError } = await supabaseAdmin
      .from("social_connections")
      .upsert(connectionData, {
        onConflict: "user_id,provider,provider_user_id,purpose", // Updated constraint
      });

    if (upsertError) {
      console.error(
        "[twitter-auth-callback] Upsert error details:",
        upsertError,
      );
      throw new Error(
        `Failed to save social connection: ${upsertError.message}`,
      );
    }

    await supabaseAdmin
      .from("oauth_state")
      .delete()
      .eq("oauth_token", requestTokenKey);

    const appUrl = Deno.env.get("SITE_URL");
    if (!appUrl) {
      throw new Error("SITE_URL is not set in Supabase secrets.");
    }
    const redirectUrl = new URL("/app/connections", appUrl);
    return Response.redirect(redirectUrl.href, 303);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[twitter-auth-callback] An error occurred:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
