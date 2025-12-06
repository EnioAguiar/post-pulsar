import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";
import { corsHeaders } from "../_shared/cors.ts";
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const state = generateRandomString(16);
    const { error: stateError } = await supabase
      .from("oauth_state")
      .insert({ state: state, user_id: userId });

    if (stateError) {
      console.error("Error saving state:", stateError);
      throw stateError;
    }

    const clientId = Deno.env.get("INSTAGRAM_CLIENT_ID");
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/instagram-auth-callback`;

    // Log the exact redirect URI to be used in the Meta App Dashboard
    console.log(
      "--- IMPORTANT: Use this exact URL in your Meta App Dashboard ---",
    );
    console.log(redirectUri);
    console.log(
      "----------------------------------------------------------------",
    );

    // Scopes for the Instagram Business Login flow, as found in the user's dashboard.
    const scopes = [
      "instagram_business_basic",
      "instagram_business_content_publish",
      "instagram_business_manage_insights",
    ].join(","); // Comma-separated for this endpoint.

    console.log("DEBUG: Instagram Auth Parameters being sent to Meta:");
    console.log("DEBUG: Client ID:", clientId);
    console.log("DEBUG: Redirect URI:", redirectUri);
    console.log("DEBUG: Scopes:", scopes);

    // Endpoint for the Instagram Business Login flow.
    const authorizationUrl = `https://www.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=${state}`;

    return new Response(JSON.stringify({ authorizationUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in instagram-auth-start:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
