
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LINKEDIN_CLIENT_ID = Deno.env.get("LINKEDIN_CLIENT_ID");
const LINKEDIN_CLIENT_SECRET = Deno.env.get("LINKEDIN_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SITE_URL = Deno.env.get("SITE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const redirectUri = `${SUPABASE_URL}/functions/v1/linkedin-auth-callback`;
  const appConnectionsUrl = `${SITE_URL}/app/connections`;

  if (!code || !state) {
    return Response.redirect(`${appConnectionsUrl}?error=Invalid request`);
  }

  try {
    // 1. Decode state to get user ID.
    const stateObject = JSON.parse(atob(state));
    const userId = stateObject.userId;
    if (!userId) {
      throw new Error("User ID not found in state.");
    }

    // 2. Exchange authorization code for an access token.
    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        client_id: LINKEDIN_CLIENT_ID!,
        client_secret: LINKEDIN_CLIENT_SECRET!,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get access token: ${await tokenResponse.text()}`);
    }
    const tokenData = await tokenResponse.json();
    const { access_token, expires_in, refresh_token, scope } = tokenData;

    // 3. Use the access token to get the user's profile info (including their LinkedIn ID).
    const userResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userResponse.ok) {
      throw new Error(`Failed to get user info: ${await userResponse.text()}`);
    }
    const userData = await userResponse.json();
    const providerUserId = userData.sub; // 'sub' is the standard OIDC field for user ID.

    if (!providerUserId) {
      throw new Error("Could not retrieve LinkedIn user ID.");
    }

    // 4. Securely save the connection details to the database.
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const expires_at = new Date(Date.now() + expires_in * 1000).toISOString();
    const scopes = scope.split(" ");

    const { error: upsertError } = await supabaseAdmin
      .from("social_connections")
      .upsert({
        user_id: userId,
        provider: "linkedin",
        provider_user_id: providerUserId,
        access_token, // Note: Should be encrypted at rest
        refresh_token, // Note: Should be encrypted at rest
        scopes,
        expires_at,
      }, { onConflict: "user_id,provider" });

    if (upsertError) {
      throw new Error(`Could not save connection: ${upsertError.message}`);
    }

    // 5. Redirect back to the app.
    return Response.redirect(`${appConnectionsUrl}?success=true`);

  } catch (error) {
    console.error("Error in LinkedIn callback:", error.message);
    return Response.redirect(`${appConnectionsUrl}?error=${encodeURIComponent(error.message)}`);
  }
});
