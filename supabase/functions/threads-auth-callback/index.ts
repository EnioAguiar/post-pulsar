import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("--- Threads Auth Callback Started ---");
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      throw new Error("Missing code or state from callback");
    }
    console.log("Code and state received.");

    // 1. Validate state to get user_id
    const { data: stateData, error: stateError } = await supabaseAdmin
      .from("oauth_state")
      .select("user_id")
      .eq("state", state)
      .single();

    if (stateError || !stateData) {
      console.error("State validation failed:", stateError);
      throw new Error("Invalid or expired state parameter.");
    }
    const userId = stateData.user_id;
    console.log(`State validated for user: ${userId}`);

    // 2. Exchange authorization code for a short-lived user access token
    const tokenUrl = "https://graph.threads.net/oauth/access_token"; // CORRECT ENDPOINT
    const tokenParams = new URLSearchParams({
      client_id: Deno.env.get("THREADS_CLIENT_ID")!,
      client_secret: Deno.env.get("THREADS_CLIENT_SECRET")!,
      grant_type: "authorization_code",
      redirect_uri: `${Deno.env.get("SUPABASE_URL")}/functions/v1/threads-auth-callback`,
      code: code,
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      body: tokenParams.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Failed to exchange code for token:", tokenData);
      throw new Error(
        tokenData.error?.message || "Failed to get short-lived token.",
      );
    }

    const shortLivedToken = tokenData.access_token;
    if (!shortLivedToken) {
      console.error(
        "Invalid response for short-lived token, missing access_token:",
        tokenData,
      );
      throw new Error("Failed to parse short-lived token response from Meta.");
    }
    console.log(`Successfully received short-lived token.`);

    // 3. Exchange the short-lived token for a long-lived token
    const longLivedTokenUrl = `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${Deno.env.get("THREADS_CLIENT_SECRET")}&access_token=${shortLivedToken}`;
    const longLivedResponse = await fetch(longLivedTokenUrl);
    const longLivedData = await longLivedResponse.json();

    if (!longLivedResponse.ok) {
      console.error("Failed to exchange for long-lived token:", longLivedData);
      throw new Error(
        longLivedData.error.message || "Failed to get long-lived token.",
      );
    }

    const longLivedToken = longLivedData.access_token;
    console.log(`Successfully received long-lived token.`);

    // 4. Get the Threads User ID and username
    const profileUrl = `https://graph.threads.net/me?fields=id,username&access_token=${longLivedToken}`;
    const profileResponse = await fetch(profileUrl);
    const profileData = await profileResponse.json();

    if (!profileResponse.ok) {
      console.error("Failed to fetch Threads profile data:", profileData);
      throw new Error(
        profileData.error?.message || "Failed to fetch Threads profile.",
      );
    }

    const threadsUserId = profileData.id;
    const threadsUsername = profileData.username;

    if (!threadsUserId || !threadsUsername) {
      console.error(
        "Could not extract id or username from profile data:",
        profileData,
      );
      throw new Error("Failed to get Threads user details.");
    }
    console.log(
      `Successfully fetched Threads User ID: ${threadsUserId} and Username: ${threadsUsername}`,
    );

    // 5. Store the connection details using upsert for robustness
    const connectionData = {
      user_id: userId,
      provider: "threads",
      access_token: longLivedToken,
      provider_user_id: threadsUserId,
      provider_user_name: threadsUsername,
      purpose: "publishing", // Added to match the new UNIQUE constraint
    };
    console.log(
      "Preparing to save connection data:",
      JSON.stringify(connectionData, null, 2),
    );

    const { error: upsertError } = await supabaseAdmin
      .from("social_connections")
      .upsert(connectionData, {
        onConflict: "user_id,provider,provider_user_id,purpose", // Updated constraint
      });

    if (upsertError) {
      console.error(
        "CRITICAL: Error saving social connection to database:",
        upsertError,
      );
      throw upsertError;
    }
    console.log("Connection data saved successfully to DB.");

    // 6. Clean up state
    await supabaseAdmin.from("oauth_state").delete().eq("state", state);
    console.log("OAuth state cleaned up.");

    // Redirect user back to the app
    const redirectUrl = new URL("/app/connections", Deno.env.get("SITE_URL"));
    console.log(`Redirecting user to: ${redirectUrl.href}`);
    return Response.redirect(redirectUrl.href, 302);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in threads-auth-callback:", errorMessage);
    const errorRedirectUrl = new URL(
      "/app/connections?error=" + encodeURIComponent(errorMessage),
      Deno.env.get("SITE_URL"),
    );
    return Response.redirect(errorRedirectUrl.href, 302);
  }
});
