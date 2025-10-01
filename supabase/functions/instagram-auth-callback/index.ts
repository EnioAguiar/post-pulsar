import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

// Follows the Instagram Business Login flow:
// https://developers.facebook.com/docs/instagram/business-login-for-instagram/getting-started

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("--- Instagram Auth Callback Started ---");
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
    const tokenUrl = "https://api.instagram.com/oauth/access_token";
    const tokenParams = new FormData();
    tokenParams.append("client_id", Deno.env.get("INSTAGRAM_CLIENT_ID")!);
    tokenParams.append(
      "client_secret",
      Deno.env.get("INSTAGRAM_CLIENT_SECRET")!,
    );
    tokenParams.append("grant_type", "authorization_code");
    tokenParams.append(
      "redirect_uri",
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/instagram-auth-callback`,
    );
    tokenParams.append("code", code);

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      body: tokenParams,
    });
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Failed to exchange code for token:", tokenData);
      throw new Error(
        tokenData.error_message || "Failed to get short-lived token.",
      );
    }

    const shortLivedToken = tokenData.access_token;
    if (!shortLivedToken) {
      console.error(
        "Invalid response for short-lived token, missing access_token:",
        tokenData,
      );
      throw new Error(
        "Failed to parse short-lived token response from Instagram.",
      );
    }
    console.log(`Successfully received short-lived token.`);

    // 3. Exchange the short-lived token for a long-lived token
    const longLivedTokenUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${Deno.env.get("INSTAGRAM_CLIENT_SECRET")}&access_token=${shortLivedToken}`;
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

    // 4. Get the Instagram Professional Account ID, username, and profile picture
    const profileUrl = `https://graph.instagram.com/me?fields=id,username,profile_picture_url&access_token=${longLivedToken}`;
    const profileResponse = await fetch(profileUrl);
    const profileData = await profileResponse.json();

    if (!profileResponse.ok) {
      console.error("Failed to fetch Instagram profile data:", profileData);
      throw new Error(
        profileData.error?.message || "Failed to fetch Instagram profile.",
      );
    }

    const professionalAccountId = profileData.id;
    const instagramUsername = profileData.username;
    const profilePictureUrl = profileData.profile_picture_url;

    if (!professionalAccountId || !instagramUsername) {
      console.error(
        "Could not extract professional_account_id or username from profile data:",
        profileData,
      );
      throw new Error("Failed to get Instagram Professional Account details.");
    }
    console.log(
      `Successfully fetched Instagram details: ID=${professionalAccountId}, Username=${instagramUsername}, Picture=${profilePictureUrl}`,
    );

    // 5. Store the connection details using upsert for robustness
    const connectionData = {
      user_id: userId,
      provider: "instagram",
      access_token: longLivedToken,
      provider_user_id: professionalAccountId,
      provider_user_name: instagramUsername,
      account_image_url: profilePictureUrl,
    };
    console.log(
      "Preparing to save connection data:",
      JSON.stringify(connectionData, null, 2),
    );

    const { error: upsertError } = await supabaseAdmin
      .from("social_connections")
      .upsert(connectionData, { onConflict: "user_id,provider,provider_user_id" });

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
    console.error("Error in instagram-auth-callback:", errorMessage);
    const errorRedirectUrl = new URL(
      "/app/connections?error=" + encodeURIComponent(errorMessage),
      Deno.env.get("SITE_URL"),
    );
    return Response.redirect(errorRedirectUrl.href, 302);
  }
});
