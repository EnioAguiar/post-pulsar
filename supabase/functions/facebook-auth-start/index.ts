import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { decode } from "https://deno.land/x/djwt@v2.2/mod.ts";

// Function to generate a random string for the state parameter
const generateRandomString = (length: number): string => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("--- Facebook Auth Start Function Invoked ---");

    const FACEBOOK_CLIENT_ID = Deno.env.get("FACEBOOK_CLIENT_ID");
    if (!FACEBOOK_CLIENT_ID) {
      console.error(
        "CRITICAL: FACEBOOK_CLIENT_ID environment variable not set or not accessible.",
      );
      throw new Error(
        "Server configuration error: Missing Facebook Client ID.",
      );
    }
    console.log("Successfully loaded FACEBOOK_CLIENT_ID.");

    // Manually get the user ID from the JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }
    const jwt = authHeader.replace("Bearer ", "");
    const [, payload] = decode(jwt);
    const userId = payload?.sub;

    if (!userId) {
      throw new Error("Could not extract user ID from JWT");
    }
    console.log(`User ID ${userId} extracted from JWT.`);

    const state = generateRandomString(16);

    // Insert the random state into the database for validation in the callback
    const { error: stateError } = await supabaseAdmin
      .from("oauth_state")
      .insert({
        state: state,
        user_id: userId,
      });

    if (stateError) {
      console.error("Error saving state to database:", stateError);
      throw new Error("Could not save state to database.");
    }
    console.log(`State ${state} saved for user ${userId}.`);

    const redirectUri = `https://wvfooigeytvdcfnzzrrg.supabase.co/functions/v1/facebook-auth-callback`;

    const scopes = [
      "pages_show_list",
      "pages_manage_posts",
      "pages_read_engagement",
    ].join(",");

    const authorizationUrl =
      `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${FACEBOOK_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&response_type=code` +
      `&state=${state}`;

    console.log("Successfully generated authorization URL. Redirecting user.");

    return new Response(JSON.stringify({ authorizationUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in facebook-auth-start:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
