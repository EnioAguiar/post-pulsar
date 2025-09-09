
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

const LINKEDIN_CLIENT_ID = Deno.env.get("LINKEDIN_CLIENT_ID");
const LINKEDIN_CLIENT_SECRET = Deno.env.get("LINKEDIN_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SITE_URL = Deno.env.get("SITE_URL");

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
    console.log('[linkedin-auth-callback] Received request.');
    console.log(`[linkedin-auth-callback] Request URL: ${req.url}`);

    // 1. Decode state to get user ID.
    const stateObject = JSON.parse(atob(state));
    const userId = stateObject.userId;
    if (!userId) {
      throw new Error("User ID not found in state.");
    }
    console.log(`[linkedin-auth-callback] Retrieved userId: ${userId} from state.`);

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
    console.log(`[linkedin-auth-callback] Retrieved providerUserId: ${providerUserId}`);

    if (!providerUserId) {
      throw new Error("Could not retrieve LinkedIn user ID.");
    }

    // 4. Securely save the connection details to the database using the shared admin client.
    const expires_at = new Date(Date.now() + expires_in * 1000).toISOString();
    const scopes = scope.split(" ");

    const connectionData = {
      user_id: userId,
      provider: "linkedin",
      provider_user_id: providerUserId,
      access_token,
      refresh_token,
      scopes,
      expires_at,
    };

    console.log('[linkedin-auth-callback] Attempting to upsert connection data:', JSON.stringify(connectionData, null, 2));

    const { error: upsertError } = await supabaseAdmin
      .from("social_connections")
      .upsert(connectionData, { onConflict: "user_id,provider,provider_user_id" });

    if (upsertError) {
      console.error('[linkedin-auth-callback] Upsert error details:', upsertError);
      throw new Error(`Could not save connection: ${upsertError.message}`);
    }

    // 5. Redirect back to the app.
    return Response.redirect(`${appConnectionsUrl}?success=true`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in LinkedIn callback:", errorMessage);
    return Response.redirect(`${appConnectionsUrl}?error=${encodeURIComponent(errorMessage)}`);
  }
});
