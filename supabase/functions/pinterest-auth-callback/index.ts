import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

const PINTEREST_CLIENT_ID = Deno.env.get("PINTEREST_CLIENT_ID");
const PINTEREST_CLIENT_SECRET = Deno.env.get("PINTEREST_CLIENT_SECRET");
const REDIRECT_URI = `${Deno.env.get("SUPABASE_URL")}/functions/v1/pinterest-auth-callback`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      throw new Error("Missing code or state from Pinterest callback.");
    }

    // 1. Validate state to get user_id
    const { data: stateData, error: stateError } = await supabaseAdmin
      .from("oauth_state")
      .select("user_id")
      .eq("state", state)
      .single();

    if (stateError || !stateData) {
      throw new Error("Invalid or expired state.");
    }
    const userId = stateData.user_id;

    // 2. Exchange code for access token
    const tokenUrl = "https://api.pinterest.com/v5/oauth/token";
    const basicAuth = btoa(`${PINTEREST_CLIENT_ID}:${PINTEREST_CLIENT_SECRET}`);

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok) {
      const errorMessage = tokens.message || "Pinterest token exchange failed.";
      throw new Error(errorMessage);
    }

    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;

    // 3. Get user info from Pinterest
    const userResponse = await fetch(
      "https://api.pinterest.com/v5/user_account",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!userResponse.ok) {
      throw new Error("Failed to fetch Pinterest user info.");
    }

    const pinterestUser = await userResponse.json();
    const providerUserId = pinterestUser.id;
    const providerUserName = pinterestUser.username;

    // 4. Save the connection to the database
    const { error: insertError } = await supabaseAdmin
      .from("social_connections")
      .insert({
        user_id: userId,
        provider: "pinterest",
        provider_user_id: providerUserId,
        provider_user_name: providerUserName,
        access_token: accessToken,
        refresh_token: refreshToken,
        scopes: tokens.scope,
      });

    if (insertError) {
      console.error("Error saving connection:", insertError);
      throw insertError;
    }

    // 5. Clean up state
    await supabaseAdmin.from("oauth_state").delete().eq("state", state);

    // 6. Redirect user back to the app
    const redirectUrl = new URL("/app/connections", Deno.env.get("SITE_URL"));
    return Response.redirect(redirectUrl.href, 302);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in pinterest-auth-callback:", errorMessage);
    const errorRedirectUrl = new URL(
      "/app/connections?error=" + encodeURIComponent(errorMessage),
      Deno.env.get("SITE_URL"),
    );
    return Response.redirect(errorRedirectUrl.href, 302);
  }
});
