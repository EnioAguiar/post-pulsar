import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

serve(async (req) => {
  // Log the incoming request URL immediately for debugging
  console.log(`[linkedin-insights-auth-callback] RAW Request URL: ${req.url}`);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // Load SITE_URL early for redirect purposes
  const SITE_URL = Deno.env.get("SITE_URL");
  const appConnectionsUrl = `${SITE_URL}/app/connections`;

  if (!code || !state) {
    return Response.redirect(
      `${appConnectionsUrl}?error=Invalid request: Missing code or state.`,
    );
  }

  try {
    console.log("[linkedin-insights-auth-callback] Received request.");

    // Load all required environment variables within the try block
    const LINKEDIN_INSIGHTS_CLIENT_ID = Deno.env.get(
      "LINKEDIN_INSIGHTS_CLIENT_ID",
    );
    const LINKEDIN_INSIGHTS_CLIENT_SECRET = Deno.env.get(
      "LINKEDIN_INSIGHTS_CLIENT_SECRET",
    );
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

    if (
      !LINKEDIN_INSIGHTS_CLIENT_ID ||
      !LINKEDIN_INSIGHTS_CLIENT_SECRET ||
      !SUPABASE_URL ||
      !SITE_URL
    ) {
      throw new Error("Missing required environment variables.");
    }
    console.log(
      "[linkedin-insights-auth-callback] All environment variables loaded.",
    );

    const redirectUri = `${SUPABASE_URL}/functions/v1/linkedin-insights-auth-callback`;

    // 1. Decode state to get user ID and purpose.
    const stateObject = JSON.parse(atob(state));
    const userId = stateObject.userId;
    const purpose = stateObject.purpose; // Extract purpose from state
    if (!userId || !purpose) {
      throw new Error("User ID or Purpose not found in state.");
    }
    console.log(
      `[linkedin-insights-auth-callback] Retrieved userId: ${userId} and purpose: ${purpose} from state.`,
    );

    // 2. Exchange authorization code for an access token.
    const tokenResponse = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          client_id: LINKEDIN_INSIGHTS_CLIENT_ID,
          client_secret: LINKEDIN_INSIGHTS_CLIENT_SECRET,
          redirect_uri: redirectUri,
        }),
      },
    );

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error(
        "[linkedin-insights-auth-callback] Token exchange failed:",
        errorBody,
      );
      throw new Error(`Failed to get access token: ${errorBody}`);
    }
    const tokenData = await tokenResponse.json();
    const { access_token, expires_in, refresh_token, scope } = tokenData;

    // 3. Use the access token to get the user's profile info (including their LinkedIn ID).
    // Use o token de acesso para obter o ID do perfil do LinkedIn e o nome do usuário.
    // O endpoint /v2/me é preferido para obter o ID do perfil necessário para outras chamadas da API.
    const userResponse = await fetch("https://api.linkedin.com/v2/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userResponse.ok) {
      const errorBody = await userResponse.text();
      console.error(
        "[linkedin-insights-auth-callback] User profile fetch failed:",
        errorBody,
      );
      throw new Error(`Failed to get user profile: ${errorBody}`);
    }
    const userData = await userResponse.json();
    const providerUserId = userData.id; // 'id' é o ID do perfil do LinkedIn
    const providerUserName =
      `${userData.localizedFirstName || ""} ${userData.localizedLastName || ""}`.trim() || "LinkedIn User";

    console.log(
      `[linkedin-insights-auth-callback] Retrieved providerUserId: ${providerUserId} and Name: ${providerUserName}`,
    );

    if (!providerUserId) {
      throw new Error("Could not retrieve LinkedIn user ID.");
    }

    // 4. Securely save the connection details to the database using the shared admin client.
    const expires_at = new Date(Date.now() + expires_in * 1000).toISOString();
    const scopes = scope.split(" ");

    const connectionData = {
      user_id: userId,
      provider: "linkedin", // Still 'linkedin' as the provider
      provider_user_id: providerUserId,
      provider_user_name: providerUserName,
      access_token,
      refresh_token,
      scopes,
      expires_at,
      purpose: purpose, // Save the purpose
    };

    console.log(
      "[linkedin-insights-auth-callback] Attempting to upsert connection data:",
      JSON.stringify(connectionData, null, 2),
    );

    const { error: upsertError } = await supabaseAdmin
      .from("social_connections")
      .upsert(connectionData, {
        onConflict: "user_id,provider,provider_user_id,purpose", // Updated onConflict
      });

    if (upsertError) {
      console.error(
        "[linkedin-insights-auth-callback] Upsert error details:",
        upsertError,
      );
      throw new Error(`Could not save connection: ${upsertError.message}`);
    }

    // 5. Redirect back to the app.
    return Response.redirect(`${appConnectionsUrl}?success=true`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in LinkedIn Insights callback:", errorMessage);
    return Response.redirect(
      `${appConnectionsUrl}?error=${encodeURIComponent(errorMessage)}`,
    );
  }
});
